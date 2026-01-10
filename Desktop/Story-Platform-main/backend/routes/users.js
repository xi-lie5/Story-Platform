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
    console.log(`[USERS路由] 查询参数:`, req.query);
    
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip = (page - 1) * limit;
    
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
    
    const queryUserId = parseInt(userId);
    
    // 构建查询条件
    const query = {
      author_id: queryUserId
    };
    
    // 分类筛选
    if (req.query.category) {
      const Category = require('../models/Category');
      const category = await Category.findOne({ name: req.query.category });
      if (category) {
        query.category_id = category.id;
      }
    }
    
    // 状态筛选
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // 搜索关键词
    if (req.query.search && req.query.search.trim()) {
      query.search = req.query.search.trim();
    }
    
    // 排序选项
    const sortOption = {};
    if (req.query.sort === 'latest' || !req.query.sort) {
      sortOption.createdAt = -1;
    } else if (req.query.sort === 'popular') {
      sortOption.view = -1;
    } else if (req.query.sort === 'rating') {
      sortOption.rating = -1;
    } else if (req.query.sort === 'updated') {
      sortOption.updatedAt = -1;
    } else {
      sortOption.createdAt = -1;
    }
    
    console.log(`查询用户故事: userId=${queryUserId}, 查询条件:`, query);
    console.log(`排序选项:`, sortOption);
    console.log(`分页参数: page=${page}, limit=${limit}, skip=${skip}`);
    console.log(`[USERS路由] 当前登录用户ID: ${req.user.id}, 查询用户ID: ${queryUserId}`);
    
    // 清除用户故事列表的缓存（确保获取最新数据）
    // 注意：缓存键的格式是 `/api/v1/users/:userId/stories?_queryParams`
    try {
      clearUserCache(queryUserId);
      console.log(`[USERS路由] 已清除用户 ${queryUserId} 的故事列表缓存`);
    } catch (cacheError) {
      console.warn(`[USERS路由] 清除缓存失败:`, cacheError.message);
    }
    
    // 查询用户的故事列表（包括所有状态：草稿、待审核、已发布等）
    console.log(`[USERS路由] 执行查询: author_id=${queryUserId}`);
    const stories = await Story.find(query, {
      sort: sortOption,
      skip: skip,
      limit: limit,
      populate: ['category', 'author']
    });
    
    // 获取总故事数（使用相同的查询条件）
    const total = await Story.countDocuments(query);
    
    console.log(`[USERS路由] 查询结果: 找到 ${stories.length} 个故事 (总共 ${total} 个)`);
    if (stories.length > 0) {
      stories.forEach((story, index) => {
        console.log(`  [${index + 1}] ${story.title} (Story ID: ${story.id}, Author ID: ${story.author_id}, Status: ${story.status}, Category: ${story.category?.name || '未分类'})`);
      });
    } else {
      console.log(`[USERS路由] 警告: 没有找到故事。查询条件 author_id=${queryUserId} 未匹配任何故事。`);
      
      // 调试：直接查询数据库，不使用查询条件过滤
      console.log(`[USERS路由] [调试] 直接查询数据库中所有故事...`);
      const { pool } = require('../config/database');
      const connection = await pool.getConnection();
      try {
        const [allStories] = await connection.execute(
          'SELECT id, title, author_id, status FROM stories WHERE author_id = ?',
          [queryUserId]
        );
        console.log(`[USERS路由] [调试] 数据库查询结果: 找到 ${allStories.length} 个 author_id=${queryUserId} 的故事`);
        allStories.forEach((s, i) => {
          console.log(`  [调试${i + 1}] ${s.title} (ID: ${s.id}, Author ID: ${s.author_id}, Status: ${s.status})`);
        });
      } catch (dbError) {
        console.error(`[USERS路由] [调试] 数据库查询失败:`, dbError.message);
      } finally {
        connection.release();
      }
    }
    
    // 确保返回的数据格式正确
    // stories是数据库原始行对象数组，字段名是下划线格式
    const responseData = {
      success: true,
      message: '获取用户故事列表成功',
      data: {
        stories: stories.map(story => {
          // story是数据库原始行对象，可能有populate后的category和author对象
          const categoryData = story.category ? (typeof story.category === 'object' ? { id: story.category.id, name: story.category.name } : null) : null;
          const authorData = story.author ? (typeof story.author === 'object' ? { id: story.author.id, username: story.author.username || '未知作者', avatar: story.author.avatar || '/avatar/default.png' } : null) : { id: null, username: '未知作者', avatar: '/avatar/default.png' };
          
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
            author: authorData,
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
        }),
        pagination: {
          page: page,
          limit: limit,
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    };
    
    console.log(`返回响应: success=${responseData.success}, stories数量=${responseData.data.stories.length}`);
    
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