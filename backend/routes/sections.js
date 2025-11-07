const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const StorySection = require('../models/StorySection');
const protect = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

router.get('/:storyId', async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    const sections = await StorySection.find({ storyId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: sections.map((section) => ({
        id: section.id,
        order: section.order,
        type: section.type,
        text: section.text,
        choices: section.choices,
        isEnd: section.isEnd,
        createdAt: section.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:storyId/:sectionId', async (req, res, next) => {
  try {
    const { storyId, sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId) || !mongoose.Types.ObjectId.isValid(sectionId)) {
      return next(errorFormat(400, '无效的章节或故事ID', [], 10011));
    }

    const section = await StorySection.findOne({ _id: sectionId, storyId });
    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    res.status(200).json({
      success: true,
      data: {
        id: section.id,
        storyId: section.storyId,
        order: section.order,
        type: section.type,
        text: section.text,
        choices: section.choices,
        isEnd: section.isEnd,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

const validateStoryOwner = async (req, res, next) => {
  const { storyId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(storyId)) {
    return next(errorFormat(400, '无效的故事ID', [], 10010));
  }

  const story = await Story.findById(storyId);
  if (!story) {
    return next(errorFormat(404, '故事不存在', [], 10010));
  }

  if (story.author.toString() !== req.user.id) {
    return next(errorFormat(403, '没有权限修改此故事章节', [], 10020));
  }

  req.story = story;
  return next();
};

router.post('/:storyId', protect, validateStoryOwner, [
  body('order').isInt({ min: 1 }).withMessage('章节顺序必须是正整数'),
  body('type').isIn(['text', 'choice']).withMessage('章节类型只能是 text 或 choice'),
  body('text').trim().notEmpty().withMessage('章节文本必填').isLength({ max: 2000 }).withMessage('章节文本不能超过2000字'),
  body('choices').custom((choices, { req }) => {
    if (req.body.type === 'choice') {
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new Error('选择型章节必须包含至少一个选项');
      }
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '章节创建失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const { order, type, text, choices, isEnd } = req.body;

    if (await StorySection.exists({ storyId, order })) {
      return next(errorFormat(400, '章节顺序已存在', [{ field: 'order', message: `顺序 ${order} 已被使用` }], 10001));
    }

    const section = await StorySection.create({
      storyId,
      order,
      type,
      text,
      choices: type === 'choice' ? choices : [],
      isEnd: Boolean(isEnd)
    });

    res.status(201).json({
      success: true,
      message: '章节创建成功',
      data: {
        id: section.id,
        order: section.order,
        type: section.type
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:storyId/:sectionId', protect, validateStoryOwner, [
  body('order').optional().isInt({ min: 1 }).withMessage('章节顺序必须是正整数'),
  body('type').optional().isIn(['text', 'choice']).withMessage('章节类型只能是 text 或 choice'),
  body('text').optional().trim().notEmpty().withMessage('章节内容不能为空'),
  body('choices').optional().isArray().withMessage('分支必须是数组')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '章节更新失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId, sectionId } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return next(errorFormat(400, '无效的章节ID', [], 10011));
    }

    if (updateData.order) {
      const exists = await StorySection.findOne({
        storyId,
        order: updateData.order,
        _id: { $ne: sectionId }
      });
      if (exists) {
        return next(errorFormat(400, '章节顺序已存在', [{ field: 'order', message: `顺序 ${updateData.order} 已被使用` }], 10001));
      }
    }

    if (updateData.type === 'text') {
      updateData.choices = [];
    }

    const section = await StorySection.findOneAndUpdate(
      { _id: sectionId, storyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    res.status(200).json({
      success: true,
      message: '章节更新成功',
      data: {
        id: section.id,
        order: section.order,
        type: section.type
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorFormat(400, '章节顺序已存在', [{ field: 'order', message: '同一故事内章节顺序不能重复' }], 10001));
    }
    next(error);
  }
});

router.delete('/:storyId/:sectionId', protect, validateStoryOwner, async (req, res, next) => {
  try {
    const { storyId, sectionId } = req.params;
    const adjustOrder = req.query.adjustOrder !== 'false';

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return next(errorFormat(400, '无效的章节ID', [], 10011));
    }

    const section = await StorySection.findOneAndDelete({ _id: sectionId, storyId });
    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    if (adjustOrder) {
      await StorySection.updateMany(
        { storyId, order: { $gt: section.order } },
        { $inc: { order: -1 } }
      );
    }

    res.status(200).json({
      success: true,
      message: `章节已删除${adjustOrder ? '，后续章节顺序已重新调整' : ''}`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;