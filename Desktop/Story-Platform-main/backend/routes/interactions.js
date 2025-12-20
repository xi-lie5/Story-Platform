const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, param } = require('express-validator');
const authGuard = require('../middleware/auth');
const Story = require('../models/Story');
const UserStoryFavorite = require('../models/UserStoryFavorite');
const UserStoryRating = require('../models/UserStoryRating');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

/**
 * @route POST /api/v1/interactions/stories/:storyId/favorite
 * @desc 添加/取消收藏故事
 * @access Private
 */
router.post('/stories/:storyId/favorite', authGuard, [
  param('storyId').custom(value => {
    if (!mongoose.Types.ObjectId.isValid(value) && !value.startsWith('local_')) {
      throw new Error('无效的故事ID');
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数验证失败', errors.array().map((err) => ({ field: err.param, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    // 对于临时故事，返回模拟响应
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        message: '临时故事不支持收藏操作',
        isFavorite: false,
        isTemporary: true
      });
    }

    // 检查故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    // 检查是否已收藏
    const existingFavorite = await UserStoryFavorite.findOne({ userId, storyId });
    
    if (existingFavorite) {
      // 取消收藏
      await UserStoryFavorite.findByIdAndDelete(existingFavorite.id);
      
      // 减少故事的收藏计数
      await Story.findByIdAndUpdate(storyId, { $inc: { favoriteCount: -1 } });
      
      return res.status(200).json({
        success: true,
        message: '取消收藏成功',
        isFavorite: false,
        isTemporary: false
      });
    } else {
      // 添加收藏
      await UserStoryFavorite.create({ userId, storyId });
      
      // 增加故事的收藏计数
      await Story.findByIdAndUpdate(storyId, { $inc: { favoriteCount: 1 } });
      
      return res.status(200).json({
        success: true,
        message: '收藏成功',
        isFavorite: true,
        isTemporary: false
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return next(errorFormat(400, '操作冲突，请重试', [], 10003));
    }
    next(error);
  }
});

/**
 * @route GET /api/v1/interactions/stories/:storyId/favorite/status
 * @desc 获取用户对故事的收藏状态
 * @access Private
 */
router.get('/stories/:storyId/favorite/status', authGuard, [
  param('storyId').custom(value => {
    if (!mongoose.Types.ObjectId.isValid(value) && !value.startsWith('local_')) {
      throw new Error('无效的故事ID');
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数验证失败', errors.array().map((err) => ({ field: err.param, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    // 对于临时故事，返回默认状态
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        data: {
          isFavorited: false,
          favoriteCount: 0,
          isTemporary: true
        }
      });
    }

    // 检查故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    // 检查收藏状态
    const isFavorite = await UserStoryFavorite.exists({ userId, storyId });
    
    return res.status(200).json({
      success: true,
      data: {
        isFavorited: Boolean(isFavorite),
        favoriteCount: story.favoriteCount || 0,
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/interactions/user/favorites
 * @desc 获取用户的收藏列表
 * @access Private
 */
router.get('/user/favorites', authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // 查询用户收藏的故事
    const favorites = await UserStoryFavorite.find({ userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('story', 'title description author coverImage rating createdAt updatedAt favoriteCount viewCount')
      .populate('story.author', 'username avatar')
      .populate('story.category', 'name');

    const total = await UserStoryFavorite.countDocuments({ userId });
    
    // 格式化返回数据，包含收藏时间和故事信息
    const formattedFavorites = favorites.map(fav => ({
      story: fav.story,
      collectedAt: fav.createdAt
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        favorites: formattedFavorites,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/interactions/stories/:storyId/rate
 * @desc 对故事进行评分
 * @access Private
 */
router.post('/stories/:storyId/rate', authGuard, [
  param('storyId').custom(value => {
    if (!mongoose.Types.ObjectId.isValid(value) && !value.startsWith('local_')) {
      throw new Error('无效的故事ID');
    }
    return true;
  }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分必须是1-5之间的整数'),
  body('comment').optional().isLength({ max: 500 }).withMessage('评论不能超过500字')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数验证失败', errors.array().map((err) => ({ field: err.param, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // 对于临时故事，返回模拟响应
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        message: '临时故事不支持评分操作',
        data: {
          rating,
          comment,
          updatedAt: new Date(),
          isTemporary: true
        }
      });
    }

    // 检查故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    // 查找或创建评分记录
    const ratingRecord = await UserStoryRating.findOneAndUpdate(
      { userId, storyId },
      { rating, comment },
      { new: true, upsert: true, runValidators: true }
    );

    // 重新计算故事的平均评分
    const ratings = await UserStoryRating.find({ storyId });
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;
    
    await Story.findByIdAndUpdate(storyId, {
      rating: averageRating,
      ratingCount: ratings.length
    });

    return res.status(200).json({
      success: true,
      message: '评分成功',
      data: {
        rating: ratingRecord.rating,
        comment: ratingRecord.comment,
        updatedAt: ratingRecord.updatedAt,
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/interactions/stories/:storyId/rating
 * @desc 获取故事的评分信息
 * @access Public
 */
router.get('/stories/:storyId/rating', [
  param('storyId').custom(value => {
    if (!mongoose.Types.ObjectId.isValid(value) && !value.startsWith('local_')) {
      throw new Error('无效的故事ID');
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数验证失败', errors.array().map((err) => ({ field: err.param, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;

    // 对于临时故事，返回默认评分信息
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        data: {
          averageRating: 0,
          ratingCount: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          userRating: null,
          recentRatings: [],
          isTemporary: true
        }
      });
    }

    // 检查故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    // 获取评分统计
    const ratings = await UserStoryRating.find({ storyId })
      .sort({ updatedAt: -1 })
      .limit(50) // 限制返回最近50条评分记录
      .populate('userId', 'username avatar');

    // 计算评分分布
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    ratings.forEach(rating => {
      ratingDistribution[rating.rating]++;
    });

    // 如果用户已登录，获取用户的评分
    let userRating = null;
    if (req.user && req.user.id) {
      userRating = await UserStoryRating.findOne({ userId: req.user.id, storyId });
    }

    return res.status(200).json({
      success: true,
      data: {
        averageRating: story.rating || 0,
        ratingCount: story.ratingCount || 0,
        ratingDistribution,
        userRating: userRating ? {
          rating: userRating.rating,
          comment: userRating.comment,
          updatedAt: userRating.updatedAt
        } : null,
        recentRatings: ratings.map(r => ({
          rating: r.rating,
          comment: r.comment,
          username: r.userId.username,
          avatar: r.userId.avatar,
          updatedAt: r.updatedAt
        })),
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/interactions/stories/:storyId/rate
 * @desc 删除用户对故事的评分
 * @access Private
 */
router.delete('/stories/:storyId/rate', authGuard, [
  param('storyId').custom(value => {
    if (!mongoose.Types.ObjectId.isValid(value) && !value.startsWith('local_')) {
      throw new Error('无效的故事ID');
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数验证失败', errors.array().map((err) => ({ field: err.param, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    // 对于临时故事，返回模拟响应
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        message: '临时故事不支持删除评分操作',
        data: {
          isTemporary: true
        }
      });
    }

    // 检查故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    // 删除评分记录
    const deletedRating = await UserStoryRating.findOneAndDelete({ userId, storyId });
    if (!deletedRating) {
      return next(errorFormat(404, '评分记录不存在', [], 10020));
    }

    // 重新计算故事的平均评分
    const ratings = await UserStoryRating.find({ storyId });
    let averageRating = 0;
    let ratingCount = ratings.length;
    
    if (ratingCount > 0) {
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      averageRating = totalRating / ratingCount;
    }
    
    await Story.findByIdAndUpdate(storyId, {
      rating: averageRating,
      ratingCount
    });

    return res.status(200).json({
      success: true,
      message: '评分删除成功',
      data: {
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;