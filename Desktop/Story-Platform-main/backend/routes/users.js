const express = require('express');
const User = require('../models/User');
const Story = require('../models/Story');
const Collection = require('../models/Collection');
const { body, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { cacheMiddleware, clearUserCache } = require('../middleware/cache');
const { isValidIntegerId } = require('../utils/idValidator');

const router = express.Router();

// 添加路由日志中间件
router.use((req, res, next) => {
  console.log(`[USERS路由] 匹配请求: ${req.method} ${req.path}`);
  next();
});

/**
 * 1. 获取当前登录用户信息
 * GET /api/v1/users/me
 */
router.get('/me', authGuard, async (req, res, next) => {
  try {
    // 从req.user获取用户信息（由protect中间件设置）
    const user = await User.findById(req.user.id);
    
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
  authGuard,
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
        const existingUser = await User.find({ username: updateData.username });
        if (existingUser.length > 0 && existingUser[0].id !== req.user.id) {
          return next(errorFormat(400, '用户名已被使用', [{ field: 'username', message: '用户名已存在' }], 10041));
        }
      }
      
      if (updateData.email) {
        const existingUser = await User.find({ email: updateData.email });
        if (existingUser.length > 0 && existingUser[0].id !== req.user.id) {
          return next(errorFormat(400, '邮箱已被使用', [{ field: 'email', message: '邮箱已被注册' }], 10042));
        }
      }
      
      // 更新用户信息
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        updateData
      );
      
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
  authGuard,
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
      const user = await User.findById(req.user.id, { includePassword: true });
      
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
 * 5. 获取用户创作统计数据
 * GET /api/v1/users/me/stats
 */
router.get('/me/stats', authGuard, cacheMiddleware(60), async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 统计已发布的故事数量
    const publishedStories = await Story.countDocuments({ 
      author: userId,
      isPublic: true 
    });
    
    // 统计草稿数量（未公开的故事）
    const draftStories = await Story.countDocuments({ 
      author: userId,
      isPublic: false 
    });
    
    // 统计收藏的故事数量
    const collectedStories = await Collection.countByUser(userId);
    
    // 统计总故事数量
    const totalStories = await Story.countDocuments({ author_id: parseInt(userId) });
    
    // 获取最近的故事统计（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentStories = await Story.countDocuments({
      author: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.status(200).json({
      success: true,
      data: {
        publishedStories,
        draftStories,
        collectedStories,
        totalStories,
        recentStories
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 6. 获取用户故事列表
 * GET /api/v1/users/:userId/stories
 * 注意：这个路由必须在 /:userId 路由之前定义，因为 Express 按照定义顺序匹配路由
 */
router.get('/:userId/stories', authGuard, cacheMiddleware(180), async (req, res, next) => {
  try {
    console.log(`[USERS路由] /:userId/stories 被调用`);
    console.log(`[USERS路由] req.path=${req.path}, req.method=${req.method}`);
    console.log(`[USERS路由] req.user=`, req.user);
    
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // 验证用户ID格式
    if (!isValidIntegerId(userId)) {
      console.log(`[USERS路由] 无效的用户ID格式: ${userId}`);
      return next(errorFormat(400, '无效的用户ID', [], 10040));
    }
    
    // 检查用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[USERS路由] 用户不存在: ${userId}`);
      return next(errorFormat(404, '用户不存在', [], 10040));
    }
    
    // 验证当前用户只能访问自己的故事列表
    if (req.user.id.toString() !== userId.toString()) {
      console.log(`[USERS路由] 权限验证失败: req.user.id=${req.user.id}, userId=${userId}`);
      return next(errorFormat(403, '无权访问其他用户的故事列表', [], 10044));
    }
    
    console.log(`[USERS路由] 权限验证通过，继续处理请求`);
    
    // 计算跳过的文档数
    const skip = (page - 1) * limit;
    
    const queryUserId = parseInt(userId);
    console.log(`查询用户故事: userId=${queryUserId}, 当前用户ID=${req.user.id}, page=${page}, limit=${limit}`);
    
    // 查询用户的故事列表（包括所有状态：草稿、待审核、已发布等）
    const stories = await Story.find(
      { author_id: queryUserId },
      {
        sort: { createdAt: -1 },
        skip: skip,
        limit: Number(limit),
        populate: ['category', 'author']
      }
    );
    
    // 获取总故事数
    const total = await Story.countDocuments({ author_id: queryUserId });
    
    console.log(`获取用户 ${queryUserId} 的故事列表: 找到 ${stories.length} 个故事 (总共 ${total} 个)`);
    if (stories.length > 0) {
      stories.forEach((story, index) => {
        console.log(`  [${index + 1}] ${story.title} (ID: ${story.id}, Status: ${story.status})`);
      });
    } else {
      console.log('  没有找到故事');
    }
    
    // 确保返回的数据格式正确
    // stories是数据库原始行对象数组，字段名是下划线格式
    const responseData = {
      success: true,
      count: stories.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      data: stories.map(story => {
        // story是数据库原始行对象，可能有populate后的category和author对象
        const categoryData = story.category ? (typeof story.category === 'object' ? { id: story.category.id, name: story.category.name } : null) : null;
        
        // 判断故事是否完成：状态为published或已完成的作品
        // 这里可以根据实际业务逻辑来判断，暂时使用status === 'published'作为完成标志
        const isCompleted = story.status === 'published';
        
        return {
          id: story.id,
          _id: story.id, // 为了兼容前端可能使用_id的地方
          title: story.title,
          description: story.description,
          category: categoryData,
          categoryId: story.category_id,
          authorId: story.author_id,
          coverImage: story.cover_image || '/coverImage/1.png',
          cover_image: story.cover_image || '/coverImage/1.png',
          status: story.status,
          isPublic: story.is_public || false,
          is_public: story.is_public || false,
          isCompleted: isCompleted,
          view: story.view_count || 0,
          view_count: story.view_count || 0,
          rating: parseFloat(story.rating || 0),
          createdAt: story.created_at,
          created_at: story.created_at,
          updatedAt: story.updated_at,
          updated_at: story.updated_at
        };
      })
    };
    
    console.log(`返回响应: success=${responseData.success}, data.length=${responseData.data.length}`);
    
    res.status(200).json(responseData);
  } catch (err) {
    next(err);
  }
});

/**
 * 7. 获取用户资料（公开信息）
 * GET /api/v1/users/:userId
 */
router.get('/:userId', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // 验证用户ID格式
    if (!isValidIntegerId(userId)) {
      return next(errorFormat(400, '无效的用户ID', [], 10040));
    }
    
    // 查询用户信息（只返回公开信息）
    const user = await User.findById(userId);
    
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10040));
    }
    
    // 获取用户故事数量
    const storyCount = await Story.countDocuments({ author_id: parseInt(userId) });
    
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.created_at,
        storyCount
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;