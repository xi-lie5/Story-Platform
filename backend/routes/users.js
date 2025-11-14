const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Story = require('../models/Story');
const { body, validationResult } = require('express-validator');
const protect = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { cacheMiddleware, clearUserCache } = require('../middleware/cache');

const router = express.Router();

/**
 * 1. 获取当前登录用户信息
 * GET /api/v1/users/me
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    // 从req.user获取用户信息（由protect中间件设置）
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10040));
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. 更新当前用户信息
 * PUT /api/v1/users/me
 */
router.put('/me', 
  protect,
  [
    body('username').optional().notEmpty().withMessage('用户名不能为空')
      .isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50个字符之间'),
    body('email').optional().isEmail().withMessage('邮箱格式不正确')
  ],
  async (req, res, next) => {
    try {
      // 验证请求数据
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(errorFormat(400, '请求数据无效', errors.array(), 10001));
      }
      
      // 构建更新数据，避免更新不允许修改的字段
      const updateData = {};
      if (req.body.username) updateData.username = req.body.username;
      if (req.body.email) updateData.email = req.body.email;
      
      // 检查用户名和邮箱是否已被其他用户使用
      if (updateData.username) {
        const existingUser = await User.findOne({
          username: updateData.username,
          _id: { $ne: req.user.id }
        });
        if (existingUser) {
          return next(errorFormat(400, '用户名已被使用', [{ field: 'username', message: '用户名已存在' }], 10041));
        }
      }
      
      if (updateData.email) {
        const existingUser = await User.findOne({
          email: updateData.email,
          _id: { $ne: req.user.id }
        });
        if (existingUser) {
          return next(errorFormat(400, '邮箱已被使用', [{ field: 'email', message: '邮箱已被注册' }], 10042));
        }
      }
      
      // 更新用户信息
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshToken');
      
      // 清除用户缓存
      clearUserCache(req.user.id);
      
      res.status(200).json({
        success: true,
        message: '用户信息更新成功',
        data: updatedUser
      });
    } catch (err) {
      if (err.code === 11000) {
        // 处理唯一索引冲突
        const field = Object.keys(err.keyValue)[0];
        return next(errorFormat(
          400, 
          field === 'username' ? '用户名已被使用' : '邮箱已被使用', 
          [{ field, message: field === 'username' ? '用户名已存在' : '邮箱已被注册' }],
          field === 'username' ? 10041 : 10042
        ));
      }
      next(err);
    }
  }
);

/**
 * 3. 更改密码
 * PUT /api/v1/users/me/change-password
 */
router.put('/me/change-password', 
  protect,
  [
    body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码长度不能少于6个字符')
  ],
  async (req, res, next) => {
    try {
      // 验证请求数据
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(errorFormat(400, '请求数据无效', errors.array(), 10001));
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // 获取用户信息
      const user = await User.findById(req.user.id).select('+password');
      
      // 验证当前密码
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return next(errorFormat(401, '当前密码错误', [{ field: 'currentPassword', message: '密码不正确' }], 10043));
      }
      
      // 更新密码
      user.password = newPassword;
      await user.save();
      
      // 清除用户缓存
      clearUserCache(req.user.id);
      
      res.status(200).json({
        success: true,
        message: '密码修改成功'
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 4. 获取用户的故事列表
 * GET /api/v1/users/:userId/stories
 */
router.get('/:userId/stories', protect, cacheMiddleware(180), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // 验证用户ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(errorFormat(400, '无效的用户ID', [], 10040));
    }
    
    // 检查用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10040));
    }
    
    // 验证当前用户只能访问自己的故事列表
    if (req.user.id !== userId) {
      return next(errorFormat(403, '无权访问其他用户的故事列表', [], 10044));
    }
    
    // 计算跳过的文档数
    const skip = (page - 1) * limit;
    
    // 查询用户的故事列表
    const stories = await Story.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // 获取总故事数
    const total = await Story.countDocuments({ author: userId });
    
    res.status(200).json({
      success: true,
      count: stories.length,
      total,
      pages: Math.ceil(total / limit),
      page: Number(page),
      data: stories
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 5. 获取用户资料（公开信息）
 * GET /api/v1/users/:userId
 */
router.get('/:userId', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // 验证用户ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(errorFormat(400, '无效的用户ID', [], 10040));
    }
    
    // 查询用户信息（只返回公开信息）
    const user = await User.findById(userId).select('username email avatar bio createdAt');
    
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10040));
    }
    
    // 获取用户故事数量
    const storyCount = await Story.countDocuments({ author: userId });
    
    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        storyCount
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;