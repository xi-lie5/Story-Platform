const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const Category = require('../models/Category');
const StorySection = require('../models/StorySection');
const protect = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

function buildSortOption(sort = 'latest') {
  switch (sort) {
    case 'popular':
      return { view: -1 };
    case 'rating':
      return { rating: -1 };
    case 'latest':
    default:
      return { createdAt: -1 };
  }
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) {
      const category = await Category.findOne({ name: req.query.category });
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10012));
      }
      filter.category = category.id;
    }

    if (req.query.search) {
      filter.$text = { $search: req.query.search.trim() };
    }

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .sort(buildSortOption(req.query.sort))
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .populate('category', 'name'),
      Story.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      message: '获取故事列表成功',
      data: {
        stories: stories.map((story) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          category: story.category,
          author: story.author,
          coverImage: story.coverImage,
          view: story.view,
          rating: story.rating,
          createdAt: story.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:storyId', async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId)
      .populate('author', 'username avatar')
      .populate('category', 'name')
      .populate({
        path: 'sections',
        options: { sort: { order: 1 } }
      });

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    await Story.findByIdAndUpdate(storyId, { $inc: { view: 1 } });

    res.status(200).json({
      success: true,
      message: '获取故事详情成功',
      data: {
        id: story.id,
        title: story.title,
        author: story.author,
        category: story.category,
        coverImage: story.coverImage,
        description: story.description,
        sections: story.sections.map((section) => ({
          id: section.id,
          order: section.order,
          type: section.type,
          text: section.text,
          choices: section.choices,
          isEnd: section.isEnd
        })),
        view: story.view + 1,
        rating: story.rating,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, [
  body('title').trim().notEmpty().withMessage('故事标题必填').isLength({ max: 100 }).withMessage('标题不能超过100个字符'),
  body('categoryId').notEmpty().withMessage('分类ID必填'),
  body('description').trim().notEmpty().withMessage('故事简介必填').isLength({ max: 500 }).withMessage('简介不能超过500个字符'),
  body('coverImage').optional().isURL().withMessage('封面必须是有效的URL')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '创建故事失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, categoryId, description, coverImage } = req.body;
    const category = await Category.findById(categoryId).session(session);
    if (!category) {
      await session.abortTransaction();
      return next(errorFormat(404, '分类不存在', [], 10012));
    }

    const story = await Story.create([{
      title,
      category: categoryId,
      description,
      coverImage: coverImage || undefined,
      author: req.user.id
    }], { session });

    await Category.updateOne({ _id: categoryId }, { $inc: { storyCount: 1 } }).session(session);

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: '创建故事成功',
      data: {
        id: story[0].id,
        title: story[0].title
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

router.put('/:storyId', protect, [
  body('title').optional().trim().notEmpty().withMessage('故事标题不能为空'),
  body('description').optional().trim().notEmpty().withMessage('故事简介不能为空'),
  body('categoryId').optional().notEmpty().withMessage('分类ID不能为空'),
  body('coverImage').optional().isURL().withMessage('封面必须是有效的URL')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新故事失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId).session(session);

    if (!story) {
      await session.abortTransaction();
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
      await session.abortTransaction();
      return next(errorFormat(403, '没有权限修改此故事', [], 10011));
    }

    const updateData = {};

    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

    if (req.body.categoryId && req.body.categoryId !== story.category.toString()) {
      const newCategory = await Category.findById(req.body.categoryId).session(session);
      if (!newCategory) {
        await session.abortTransaction();
        return next(errorFormat(404, '分类不存在', [], 10012));
      }

      await Category.updateOne({ _id: story.category }, { $inc: { storyCount: -1 } }).session(session);
      await Category.updateOne({ _id: newCategory.id }, { $inc: { storyCount: 1 } }).session(session);
      updateData.category = newCategory.id;
    }

    await Story.updateOne({ _id: storyId }, updateData).session(session);

    await session.commitTransaction();
    res.status(200).json({ success: true, message: '故事更新成功' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

router.delete('/:storyId', protect, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId).session(session);

    if (!story) {
      await session.abortTransaction();
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
      await session.abortTransaction();
      return next(errorFormat(403, '没有权限删除此故事', [], 10011));
    }

    await StorySection.deleteMany({ storyId }).session(session);
    await Story.deleteOne({ _id: storyId }).session(session);
    await Category.updateOne({ _id: story.category }, { $inc: { storyCount: -1 } }).session(session);

    await session.commitTransaction();
    res.status(200).json({ success: true, message: '故事及关联章节已删除' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

module.exports = router;