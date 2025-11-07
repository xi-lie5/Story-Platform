const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const Category = require('../models/Category');
const StorySection = require('../models/StorySection');
const protect = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

const BASE_URL = '/api/v1';

// 1. 获取故事列表（API：GET /stories，支持分页筛选）
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, categoryname, search, sort } = req.query;
    const query = {};
    if (categoryname) {
      const category = await Category.findOne({ name: categoryname });
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10012));
      }
      query.category = category._id;
    }
    if (search) {
      query.$text = { $search: search };
    }
    // 构建排序条件（API的sort参数）
    let sortOption = {};
    if (sort) {
      switch (sort) {
        case 'popular':
          sortOption = { view: -1 };
          break;
        case 'lastest':
          sortOption = { createdAt: -1 };
          break;
        default:
          sortOption = { rat: -1 };
      }
    }

    const validpage = page ? Number(page) < 1 ? 1 : Number(page) : 1;
    const validalimit = limit ? Number(limit) < 1 ? 10 : Number(limit) : 10;
    const skip = (validpage - 1) * validalimit;

    const storylist = await Story.find(query).skip(skip).sort(sortOption).limit(validalimit)
      .populate('author', 'username avatar') // 仅返回作者的用户名和头像
      .populate('category', 'id name'); // 仅返回分类的ID和名称;

    const total = await Story.countDocuments(query); // 总数量（用于分页信息）
    res.status.json({
      success: true,
      message: '获取故事列表成功',
      data: {
        stories: storylist.map((story) => {
          return {
            id: story._id,
            title: story.title,
            description: story.description,
            category: story.category,
            author: story.author,
            coverImage: story.coverImage,
            view: story.view,
            rating: story.rating,
            createdAt: story.createdAt
          }
        }),
        pagination: {
          page: validpage,
          limit: validalimit,
          total: total,
          pages: Math.ceil(total / validalimit)
        }
      }
    })
  } catch (err) {
    next(err);
  }
});

// 2. 获取故事详情（API：GET /stories/{storyId}）
router.get('/:storyId', async (req, res, next) => {
  try {
    const storyId = req.params;
    const story = await Story.findById(storyId)
      .populate('author', 'username avatar')
      .populate('category', 'name')
      .populate({
        path: 'sections',
        options: { sort: { order: 1 } } // 章节按顺序返回
      });

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));

    }
    // 浏览量+1（每次查看详情递增）
    story.view += 1;
    await story.save();

    res.status(200).json({
      success: true,
      message: '获取故事详情成功',
      data: {

        id: story._id,
        title: story.title,
        author: story.author,
        category: story.category,
        coverImage: story.coverImage,
        description: story.description,
        sections: story.sections.map(section => ({ // 章节列表
          id: section._id,
          order: section.order,
          type: section.type,
          text: section.text,
          choices: section.choices,
          isEnd: section.isEnd
        })),
        view: story.view,
        rating: story.rating,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
      }
    })
  } catch (err) {
    next(err);
  }

});

// 3. 创建故事（API：POST /stories，需认证）--仅创建故事主体（不含章节，章节通过单独接口添加）
router.post('/', protect, [
  body('title').notEmpty().withMessage('故事标题必填').isLength({ max: 100 }).withMessage('标题不能超过100字'),
  body('categoryId').notEmpty().withMessage('分类ID必填'),
  body('description').notEmpty().withMessage('故事简介必填').isLength({ max: 500 }).withMessage('简介不能超过500字')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(errorFormat(400, '创建故事失败', errors.array()));
    }
    const { title, categoryId, description, content, coverImage } = req.body;
    const userId = req.user.id; // 从protect中间件获取当前用户ID

    const category = await Category.findById(categoryId);
    if (!category) {
      return next(errorFormat(404, '分类不存在', [], 10012));
    }
    // 启动事务会话
    const session = await mongoose.startSession();
    session.startTransaction();
    // 1. 创建故事主体
    const story = await Story.create([{
      author: userId,
      title: title,
      category: categoryId,
      description: description,
      coverImage: coverImage || '/coverImage/1.png'
    }],
      { session } // 传入事务会话
    );
    // create 返回数组，取第一个元素
    const createdStory = story[0];

    // 事务提交：所有操作成功后确认
    await session.commitTransaction();
    session.endSession();

    //  更新故事的章节数量
    category.storyCount += 1;
    await category.save();

    // 返回成功结果
    res.status(201).json({
      success: true,
      message: '创建成功',
      data: {
        id: createdStory._id,
        title: createdStory.title,
      }
    });

  } catch (err) {
    // 事务回滚：任何一步失败，回滚所有操作
    if (session) {
      await session.abortTransaction();
      console.log('操作失败，事务回滚');
      session.endSession();
    }
    next(err); // 处理错误
  }
});

// 4. 更新故事（API：PUT /stories/{storyId}，需作者权限）
router.put('/:storyId', protect, async (req, res, next) => {
  try {
    // 1. 启动会话
    const session = await mongoose.startSession();
    session.startTransaction(); // 开始事务

    const { storyId } = req.params;//必须要有
    const story = await Story.findById(storyId).session(session);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }
    if (story.author.toString() !== req.user.id) {
      return next(errorFormat(403, '没有权限', [], 10011));
    }
    const UpdateData = req.body; // 更新数据--不确定请求体内有什么内容，逐一检查
    if (UpdateData.title) {
      story.title = UpdateData.title;
    }
    if (UpdateData.category) {
      const newcategory = await Category.findOne({ name: UpdateData.category }).session(session);
      if (!newcategory) {
        return next(errorFormat(404, '分类不存在', [], 10012));
      }
      const storycatgory = await Category.findById(story.category).session(session);
      storycatgory.storyCount -= 1;
      newcategory.storyCount += 1;
      storycatgory.save({ session });
      newcategory.save({ session });
      story.category = newcategory._id;
    }
    if (UpdateData.description) {
      story.description = UpdateData.description;
    }
    // 图片存储后续再说
    if (UpdateData.coverImage) {
      story.coverImage = UpdateData.coverImage;
    }
    story.save({ session });
    // 提交事务
    await session.commitTransaction();
    session.endSession();

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: '故事更新成功'
    });

  } catch (err) {
    // 事务回滚（任何错误都撤销所有更新）
    await session.abortTransaction();
    console.log('操作失败，事务回滚');
    session.endSession();
    next(err);
  }
});


// 5. 删除故事（API：DELETE /stories/{storyId}，需作者权限）
router.delete('/:storyId', protect, async (req, res, next) => {
  const { storyId } = req.params;
  // 启动会话
  const session = await mongoose.startSession();
  session.startTransaction(); // 开始事务
  try {
    const story = await Story.findById(storyId).session(session);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }
    if (story.author.toString() !== req.user.id) {
      return next(errorFormat(403, '没有权限', [], 10011));
    }

    const category = await Category.findById(story.category).session(session);
    category.storyCount -= 1;
    category.save({ session });

    //  删除关联的所有章节
    await StorySection.deleteMany({ storyId: storyId }).session(session);

    // 删除故事
    // await story.remove({ session });
    await Story.findByIdAndDelete(storyId).session(session);


    // 提交事务
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: '故事及关联章节已删除'
    });


  } catch (err) {
    await session.abortTransaction();
    console.log('操作失败，事务回滚');
    session.endSession();
    next(err);
  }

});

module.exports = router;