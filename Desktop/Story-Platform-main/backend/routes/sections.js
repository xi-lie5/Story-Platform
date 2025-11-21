const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, param } = require('express-validator');
const Story = require('../models/Story');
const StorySection = require('../models/StorySection');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

// 公共章节路由 - 必须在 /:storyId 之前
router.get('/public', async (req, res, next) => {
  try {
    // 这里可以实现获取公共章节的逻辑
    res.status(200).json({
      success: true,
      message: '获取公共章节成功',
      data: []
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

    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    const sections = await StorySection.find({ storyId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: sections.map((section) => ({
        id: section.id,
        temporaryId: section.temporaryId,
        order: section.order,
        type: section.type,
        title: section.title,
        text: section.text,
        visualPosition: section.visualPosition,
        choices: section.choices,
        isEnd: section.isEnd,
        createdAt: section.createdAt,
        statistics: section.statistics
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:storyId/:sectionId', async (req, res, next) => {
  try {
    const { storyId, sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    // 支持通过临时ID查找章节
    let query = { storyId };
    if (mongoose.Types.ObjectId.isValid(sectionId)) {
      query._id = sectionId;
    } else {
      query.temporaryId = sectionId;
    }

    const section = await StorySection.findOne(query);
    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    // 更新查看计数
    await StorySection.findByIdAndUpdate(section.id, { $inc: { 'statistics.viewCount': 1 } });

    res.status(200).json({
      success: true,
      data: {
        id: section.id,
        temporaryId: section.temporaryId,
        storyId: section.storyId,
        order: section.order,
        type: section.type,
        title: section.title,
        text: section.text,
        visualPosition: section.visualPosition,
        choices: section.choices,
        isEnd: section.isEnd,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
        statistics: section.statistics
      }
    });
  } catch (error) {
    next(error);
  }
});

const validateStoryOwner = async (req, res, next) => {
  const { storyId } = req.params;

  // 对于临时ID（以local_开头），跳过权限验证，允许创建临时章节
  if (storyId.startsWith('local_')) {
    req.story = { author: { toString: () => req.user.id } }; // 模拟story对象
    req.isTemporaryStory = true; // 标记这是临时故事
    return next();
  }

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
  req.isTemporaryStory = false;
  return next();
};

router.post('/:storyId', authGuard, validateStoryOwner, [
  body('order').isInt({ min: 1 }).withMessage('章节顺序必须是正整数'),
  body('type').isIn(['text', 'choice']).withMessage('章节类型只能是 text 或 choice'),
  body('text').trim().notEmpty().withMessage('章节文本必填').isLength({ max: 2000 }).withMessage('章节文本不能超过2000字'),
  body('temporaryId').optional().isString().withMessage('临时ID必须是字符串'),
  body('choices').custom((choices, { req }) => {
    if (req.body.type === 'choice') {
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new Error('选择型章节必须包含至少一个选项');
      }
      // 验证选项结构
      choices.forEach((choice, index) => {
        if (!choice.text || typeof choice.text !== 'string') {
          throw new Error(`选项${index + 1}的文本不能为空`);
        }
        // 检查nextSectionId和nextTemporaryId，确保至少有一个存在或都不存在
        if (choice.nextSectionId && choice.nextTemporaryId) {
          throw new Error(`选项${index + 1}不能同时设置nextSectionId和nextTemporaryId`);
        }
      });
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
    const { order, type, text, choices = [], isEnd = false, temporaryId, visualPosition, title } = req.body;

    // 对于临时故事，直接返回成功，不进行数据库操作
    if (req.isTemporaryStory) {
      const mockSectionId = 'temp_section_' + Date.now();
      return res.status(201).json({
        success: true,
        message: '临时章节创建成功',
        data: {
          id: mockSectionId,
          temporaryId: temporaryId || mockSectionId,
          order,
          type,
          isTemporary: true
        }
      });
    }

    // 检查顺序是否已存在
    if (await StorySection.exists({ storyId, order })) {
      return next(errorFormat(400, '章节顺序已存在', [{ field: 'order', message: `顺序 ${order} 已被使用` }], 10001));
    }

    // 检查临时ID是否已存在
    if (temporaryId && await StorySection.exists({ storyId, temporaryId })) {
      return next(errorFormat(400, '临时ID已存在', [{ field: 'temporaryId', message: `临时ID ${temporaryId} 已被使用` }], 10001));
    }

    // 处理选项，支持临时ID引用
    const processedChoices = type === 'choice' ? choices.map(choice => ({
      id: choice.id,
      text: choice.text,
      description: choice.description,
      nextSectionId: choice.nextSectionId && mongoose.Types.ObjectId.isValid(choice.nextSectionId) ? choice.nextSectionId : undefined,
      nextTemporaryId: choice.nextTemporaryId || undefined
    })) : [];

    const section = await StorySection.create({
      storyId,
      order,
      type,
      text,
      title,
      choices: processedChoices,
      isEnd: Boolean(isEnd),
      temporaryId,
      visualPosition: visualPosition || { x: 0, y: 0 }
    });

    res.status(201).json({
      success: true,
      message: '章节创建成功',
      data: {
        id: section.id,
        temporaryId: section.temporaryId,
        order: section.order,
        type: section.type,
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:storyId/:sectionId', authGuard, validateStoryOwner, [
  body('order').optional().isInt({ min: 1 }).withMessage('章节顺序必须是正整数'),
  body('type').optional().isIn(['text', 'choice']).withMessage('章节类型只能是 text 或 choice'),
  body('text').optional().trim().notEmpty().withMessage('章节内容不能为空'),
  body('temporaryId').optional().isString().withMessage('临时ID必须是字符串'),
  body('choices').optional().custom((choices, { req }) => {
    if (choices && Array.isArray(choices)) {
      choices.forEach((choice, index) => {
        if (choice.text && typeof choice.text !== 'string') {
          throw new Error(`选项${index + 1}的文本必须是字符串`);
        }
        // 检查nextSectionId和nextTemporaryId，确保至少有一个存在或都不存在
        if (choice.nextSectionId && choice.nextTemporaryId) {
          throw new Error(`选项${index + 1}不能同时设置nextSectionId和nextTemporaryId`);
        }
      });
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '章节更新失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId, sectionId } = req.params;
    const updateData = { ...req.body };

    // 对于临时故事，直接返回成功，不进行数据库操作
    if (req.isTemporaryStory) {
      return res.status(200).json({
        success: true,
        message: '临时章节更新成功',
        data: {
          id: sectionId,
          temporaryId: sectionId,
          order: updateData.order || 1,
          type: updateData.type || 'text',
          isTemporary: true
        }
      });
    }

    // 构建查询条件，支持通过临时ID更新
    let query = { storyId };
    if (mongoose.Types.ObjectId.isValid(sectionId)) {
      query._id = sectionId;
    } else {
      query.temporaryId = sectionId;
    }

    // 查找现有章节
    const existingSection = await StorySection.findOne(query);
    if (!existingSection) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    // 检查顺序是否冲突
    if (updateData.order && updateData.order !== existingSection.order) {
      const exists = await StorySection.findOne({
        storyId,
        order: updateData.order,
        _id: { $ne: existingSection.id }
      });
      if (exists) {
        return next(errorFormat(400, '章节顺序已存在', [{ field: 'order', message: `顺序 ${updateData.order} 已被使用` }], 10001));
      }
    }

    // 检查临时ID是否冲突
    if (updateData.temporaryId && updateData.temporaryId !== existingSection.temporaryId) {
      const tempIdExists = await StorySection.findOne({
        storyId,
        temporaryId: updateData.temporaryId,
        _id: { $ne: existingSection.id }
      });
      if (tempIdExists) {
        return next(errorFormat(400, '临时ID已存在', [{ field: 'temporaryId', message: `临时ID ${updateData.temporaryId} 已被使用` }], 10001));
      }
    }

    // 处理选项，支持临时ID引用
    if (updateData.choices && Array.isArray(updateData.choices)) {
      updateData.choices = updateData.choices.map(choice => ({
        id: choice.id,
        text: choice.text,
        description: choice.description,
        nextSectionId: choice.nextSectionId && mongoose.Types.ObjectId.isValid(choice.nextSectionId) ? choice.nextSectionId : undefined,
        nextTemporaryId: choice.nextTemporaryId || undefined
      }));
    }

    if (updateData.type === 'text') {
      updateData.choices = [];
    }

    const section = await StorySection.findByIdAndUpdate(
      existingSection.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: '章节更新成功',
      data: {
        id: section.id,
        temporaryId: section.temporaryId,
        order: section.order,
        type: section.type,
        isTemporary: false
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorFormat(400, '章节顺序已存在', [{ field: 'order', message: '同一故事内章节顺序不能重复' }], 10001));
    }
    next(error);
  }
});

router.delete('/:storyId/:sectionId', authGuard, validateStoryOwner, async (req, res, next) => {
  try {
    const { storyId, sectionId } = req.params;
    const adjustOrder = req.query.adjustOrder !== 'false';

    // 对于临时故事，直接返回成功，不进行数据库操作
    if (req.isTemporaryStory) {
      return res.status(200).json({
        success: true,
        message: '临时章节删除成功',
        data: {
          id: sectionId,
          isTemporary: true
        }
      });
    }

    // 构建查询条件，支持通过临时ID删除
    let query = { storyId };
    if (mongoose.Types.ObjectId.isValid(sectionId)) {
      query._id = sectionId;
    } else {
      query.temporaryId = sectionId;
    }

    const section = await StorySection.findOneAndDelete(query);
    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    // 1. 调整后续章节顺序
    if (adjustOrder) {
      await StorySection.updateMany(
        { storyId, order: { $gt: section.order } },
        { $inc: { order: -1 } }
      );
    }

    // 2. 更新引用了该章节的其他章节选项
    await StorySection.updateMany(
      { storyId, 'choices.nextSectionId': section.id },
      { $unset: { 'choices.$.nextSectionId': '' } }
    );

    // 3. 可选：更新其他章节中的统计数据等

    res.status(200).json({
      success: true,
      message: `章节已删除${adjustOrder ? '，后续章节顺序已重新调整' : ''}，引用关系已更新`,
      data: {
        id: section.id,
        temporaryId: section.temporaryId,
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;