const express = require('express');
const mongoose = require('mongoose');
const Story = require('../models/Story');
const StorySection = require('../models/StorySection');
const { body, validationResult } = require('express-validator');
const protect = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();


/**
 * 1. 获取故事的所有章节（公开接口）
 * GET /api/v1/stories/:storyId/sections
 * 按order升序排列
 */
router.get('/:storyId', async (req, res, next) => {
  try {
    const { storyId } = req.params;
    
    // 验证storyId格式
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    // 验证故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10012));
    }

    // 查询章节并按顺序排序
    const sections = await StorySection.find({ storyId })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        storyId,
        sections: sections.map(section => ({
          id: section._id,
          order: section.order,
          type: section.type,
          text: section.text,
          choices: section.choices,
          isEnd: section.isEnd,
          createdAt: section.createdAt
        })),
        total: sections.length
      }
    });
  } catch (err) {
    next(err);
  }
});


/**
 * 2. 获取单个章节（公开接口）
 * GET /api/v1/stories/:storyId/sections/:sectionId
 */
router.get('/:storyId/:sectionId', async (req, res, next) => {
  try {
    const { storyId, sectionId } = req.params;

    // 验证storyId格式
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    // 验证sectionId格式
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return next(errorFormat(400, '无效的章节ID', [], 10011));
    }
    
    // 验证故事和章节存在，且章节属于该故事
    const section = await StorySection.findOne({
      _id: sectionId,
      storyId
    });

    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    res.status(200).json({
      success: true,
      data: {
        id: section._id,
        storyId: section.story,
        order: section.order,
        type: section.type,
        text: section.text,
        choices: section.choices,
        isEnd: section.isEnd,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
});


/**
 * 3. 创建章节（需作者权限）
 * POST /api/v1/stories/:storyId/sections
 * 需指定order（章节顺序）
 */
router.post('/:storyId',
  protect,
  async (req, res, next) => {
    try {
      const { storyId } = req.params;
      const story = await Story.findById(storyId);
      if (!story || story.author.toString() !== req.user.id) {
        return next(errorFormat(403, '没有权限修改此故事章节', [], 10020));
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  [
    body('order').isInt({ min: 1 }).withMessage('章节顺序必须是正整数'),
    body('type').isIn(['text', 'choice']).withMessage('章节类型只能是text或choice'),
    body('text').notEmpty().withMessage('章节文本必填')
      .isLength({ max: 2000 }).withMessage('文本不能超过2000字'),
    // 选择型章节必须包含choices
    body('choices').custom((value, { req }) => {
      if (req.body.type === 'choice' && (!value || value.length === 0)) {
        throw new Error('选择型章节必须包含选项');
      }
      return true;
    })
  ], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errorFormat(400, '请求数据无效', errors.array(), 10001));
    }

    try {
      const { storyId } = req.params;
      const { order, type, text, choices, isEnd } = req.body;

      // 检查同故事内是否已有相同order的章节（通过索引也会报错，这里提前提示更友好）
    const existingSection = await StorySection.findOne({ storyId, order });
      if (existingSection) {
        return next(errorFormat(
          400,
          '章节顺序已存在，请更换顺序号',
          [{ field: 'order', message: `顺序${order}已被使用` }]
        ));
      }

      // 创建章节
      const section = await StorySection.create({
        storyId,
        storytype: type,
        order,
        text,
        choice: type === 'choice' ? choices : [], // 非选择型章节清空choices
        isEnd: isEnd || false
      });

      res.status(201).json({
        success: true,
        message: '章节创建成功',
        data: {
          id: section._id,
          order: section.order,
          type: section.type
        }
      });
    } catch (err) {
      // 捕获索引冲突错误（同故事同order）
      if (err.code === 11000) {
        return next(errorFormat(
          400,
          '章节顺序已存在',
          [{ field: 'order', message: '同一故事内章节顺序不能重复' }]
        ));
      }
      next(err);
    }
  }
);


/**
 * 4. 更新章节（需作者权限）
 * PUT /api/v1/stories/:storyId/sections/:sectionId
 */
router.put('/:storyId/:sectionId', protect,
  async (req, res, next) => {
    try {
      const { storyId } = req.params;
      const story = await Story.findById(storyId);
      if (!story || story.author.toString() !== req.user.id) {
        return next(errorFormat(403, '没有权限修改此故事章节', [], 10020));
      }
      next();
    } catch (err) {
      next(err);
    }
  }, 
  [
    body('order').optional().isInt({ min: 1 }).withMessage('章节顺序必须是正整数'),
    body('type').optional().isIn(['text', 'choice']).withMessage('章节类型只能是text或choice'),
    body('text').optional().notEmpty().withMessage('章节文本不能为空')
      .isLength({ max: 2000 }).withMessage('文本不能超过2000字')
  ], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新章节失败', errors.array()));
  }

  try {
    const { storyId, sectionId } = req.params;
    const updateData = req.body;

    // 如果更新order，检查新order是否已被占用
    if (updateData.order) {
      const existingSection = await StorySection.findOne({
        storyId,
        order: updateData.order,
        _id: { $ne: sectionId } // 排除当前章节
      });
      if (existingSection) {
        return next(errorFormat(
          400,
          '章节顺序已存在',
          [{ field: 'order', message: `顺序${updateData.order}已被使用` }]
        ));
      }
    }

    // 非选择型章节清空choice
    if (updateData.type === 'text') {
      updateData.choice = [];
    }
    
    // 确保字段名正确
    if (updateData.type) {
      updateData.storytype = updateData.type;
      delete updateData.type;
    }
    if (updateData.choices) {
      updateData.choice = updateData.choices;
      delete updateData.choices;
    }

    // 更新章节
    const section = await StorySection.findOneAndUpdate(
      { _id: sectionId, storyId }, // 确保章节属于该故事
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
        id: section._id,
        order: section.order,
        type: section.type
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(errorFormat(
        400,
        '章节顺序已存在',
        [{ field: 'order', message: '同一故事内章节顺序不能重复' }]
      ));
    }
    next(err);
  }
});


/**
 * 5. 删除章节（需作者权限）
 * DELETE /api/v1/stories/:storyId/sections/:sectionId
 * 可选：删除后自动调整后续章节的order（避免顺序断层）
 */
router.delete('/:storyId/:sectionId', protect,
  async (req, res, next) => {
    try {
      const { storyId } = req.params;
      const story = await Story.findById(storyId);
      if (!story || story.author.toString() !== req.user.id) {
        return next(errorFormat(403, '没有权限删除此故事章节', [], 10020));
      }
      next();
    } catch (err) {
      next(err);
    }
  }, async (req, res, next) => {
  try {
    const { storyId, sectionId } = req.params;
    const { adjustOrder = true } = req.query; // 是否自动调整后续章节顺序

    // 查找章节
    const section = await StorySection.findOne({
      _id: sectionId,
      storyId
    });

    if (!section) {
      return next(errorFormat(404, '章节不存在或不属于该故事', [], 10011));
    }

    const deletedOrder = section.order;

    // 删除章节
    await StorySection.findByIdAndDelete(sectionId);

    // 如果需要调整顺序：后续章节的order-1
    if (adjustOrder === 'true') {
      await StorySection.updateMany(
        { storyId, order: { $gt: deletedOrder } }, // 只调整顺序更大的章节
        { $inc: { order: -1 } } // order减1
      );
    }

    res.status(200).json({
      success: true,
      message: `章节已删除${adjustOrder === 'true' ? '，后续章节顺序已自动调整' : ''}`
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;