const express = require('express');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');
const Story = require('../models/Story');
const { body, validationResult } = require('express-validator');
const protect = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

/**
 * 1. 获取用户收藏的故事列表
 * GET /api/v1/users/collections
 */
router.get('/users/collections', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 查询用户收藏的故事
    const collections = await Collection.find({ user: req.user.id })
      .sort({ collectedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: 'story',
        select: 'title description coverImage category author createdAt updatedAt sectionCount'
      });

    // 获取总数
    const total = await Collection.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      data: collections,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. 添加收藏
 * POST /api/v1/users/collections
 */
router.post('/users/collections', 
  protect,
  [
    body('storyId').notEmpty().withMessage('故事ID不能为空')
  ],
  async (req, res, next) => {
    try {
      // 验证请求数据
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(errorFormat(400, '请求数据无效', errors.array(), 10001));
      }

      const { storyId } = req.body;

      // 验证故事ID格式
      if (!mongoose.Types.ObjectId.isValid(storyId)) {
        return next(errorFormat(400, '无效的故事ID', [], 10020));
      }

      // 检查故事是否存在
      const story = await Story.findById(storyId);
      if (!story) {
        return next(errorFormat(404, '故事不存在', [], 10020));
      }

      // 检查是否已经收藏
      const existingCollection = await Collection.findOne({
        user: req.user.id,
        story: storyId
      });

      if (existingCollection) {
        return next(errorFormat(400, '收藏已存在', [], 10014));
      }

      // 创建收藏
      const collection = await Collection.create({
        user: req.user.id,
        story: storyId
      });

      res.status(201).json({
        success: true,
        message: '收藏成功',
        data: collection
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 3. 取消收藏
 * DELETE /api/v1/users/collections/:storyId
 */
router.delete('/users/collections/:storyId', protect, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    // 验证故事ID格式
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10020));
    }

    // 删除收藏
    const result = await Collection.findOneAndDelete({
      user: req.user.id,
      story: storyId
    });

    if (!result) {
      return next(errorFormat(404, '收藏不存在', [], 10015));
    }

    res.status(200).json({
      success: true,
      message: '取消收藏成功'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;