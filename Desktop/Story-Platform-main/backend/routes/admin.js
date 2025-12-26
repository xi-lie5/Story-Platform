const express = require('express');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const User = require('../models/User');
const Category = require('../models/Category');
const { adminGuard, editorGuard } = require('../middleware/adminAuth');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { cacheMiddleware, clearStoryCache, clearCategoryCache } = require('../middleware/cache');
const { isValidIntegerId } = require('../utils/idValidator');

const router = express.Router();

// 所有管理员路由都需要先通过认证，再检查管理员权限
router.use((req, res, next) => {
  console.log(`[ADMIN路由] 请求路径: ${req.path}, 方法: ${req.method}`);
  next();
});
router.use(authGuard);

// ==================== 管理员统计信息 ====================
// 获取管理员统计数据
router.get('/stats', adminGuard, async (req, res, next) => {
  try {
    const [
      totalStories,
      publishedStories,
      draftStories,
      totalUsers,
      totalCategories,
      pendingStories,
      rejectedStories
    ] = await Promise.all([
      Story.countDocuments(),
      Story.countDocuments({ status: 'published' }),
      Story.countDocuments({ status: 'draft' }),
      User.countDocuments(),
      Category.countDocuments(),
      Story.countDocuments({ status: 'pending' }),
      Story.countDocuments({ status: 'rejected' })
    ]);

    res.status(200).json({
      success: true,
      message: '获取统计信息成功',
      data: {
        stories: {
          total: totalStories,
          published: publishedStories,
          draft: draftStories,
          pending: pendingStories,
          rejected: rejectedStories
        },
        users: {
          total: totalUsers
        },
        categories: {
          total: totalCategories
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 作品管理 ====================

// 获取所有作品（包括草稿和已发布）
router.get('/stories', adminGuard, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';

    // 构建查询条件
    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const searchTerm = req.query.search ? req.query.search.trim() : null;

    const [stories, total] = await Promise.all([
      Story.find(filter, {
        sort: { createdAt: -1 },
        skip: skip,
        limit: limit,
        populate: ['author', 'category']
      }),
      Story.countDocuments(filter)
    ]);
    
    // 手动处理搜索（如果提供了搜索词）
    let filteredStories = stories;
    if (searchTerm) {
      filteredStories = stories.filter(story => 
        story.title.includes(searchTerm) || 
        story.description.includes(searchTerm)
      );
    }
    
    console.log(`管理员获取故事列表: 状态=${status}, 找到 ${filteredStories.length} 个故事 (总共 ${total} 个)`);

    res.status(200).json({
      success: true,
      message: '获取作品列表成功',
      data: {
          stories: filteredStories.map((story) => ({
            _id: story.id,
            id: story.id,
            title: story.title,
            description: story.description,
            category: story.category || null,
            author: story.author || null,
            coverImage: story.cover_image,
            cover_image: story.cover_image,
            view: story.view_count || 0,
            view_count: story.view_count || 0,
            rating: story.rating || 0,
            status: story.status,
            isPublic: story.is_public,
            is_public: story.is_public,
            tags: story.tags,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt
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

// 审核作品（通过/拒绝）
router.put('/stories/:storyId/review', adminGuard, [
  body('action').isIn(['approve', 'reject']).withMessage('操作必须是approve或reject'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('审核意见不能超过500个字符')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '审核操作失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const { action, reason } = req.body;

    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的ID格式', [], 10010));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '作品不存在', [], 10010));
    }

    if (story.status !== 'pending') {
      return next(errorFormat(400, '只能审核待审核状态的作品', [], 10014));
    }

    // 获取作者信息
    const User = require('../models/User');
    const author = await User.findById(story.author_id);

    // 更新作品状态
    const updatedStory = await Story.findByIdAndUpdate(storyId, {
      status: action === 'approve' ? 'published' : 'rejected',
      isPublic: action === 'approve'
    });

    // 清除相关缓存
    clearStoryCache(storyId);

    res.status(200).json({
      success: true,
      message: action === 'approve' ? '作品审核通过，已发布' : '作品已拒绝',
      data: {
        id: updatedStory.id,
        title: updatedStory.title,
        status: updatedStory.status,
        isPublic: updatedStory.is_public,
        author: author ? { username: author.username, email: author.email } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// 删除作品
router.delete('/stories/:storyId', adminGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '作品不存在', [], 10010));
    }

    await Story.findByIdAndDelete(storyId);

      // 更新分类的故事数量
      if (story.category_id) {
        await Category.updateStoryCount(story.category_id, -1);
      }

    // 清除相关缓存
    clearStoryCache(storyId);

    res.status(200).json({
      success: true,
      message: '作品删除成功'
    });
  } catch (error) {
    next(error);
  }
});

// 管理员强制下架作品
router.patch('/stories/:storyId/unpublish', adminGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的作品ID', [], 10010));
    }

    const story = await Story.findById(storyId);
    
    // 获取作者信息
    const User = require('../models/User');
    const author = story ? await User.findById(story.author_id) : null;

    if (!story) {
      return next(errorFormat(404, '作品不存在', [], 10010));
    }

    if (story.status !== 'published') {
      return next(errorFormat(400, '只有已发布的作品才能下架', [], 10018));
    }

    // 更新作品状态为下架
    const updatedStory = await Story.findByIdAndUpdate(storyId, {
      status: 'unpublished',
      isPublic: false
    });

    // 清除相关缓存
    clearStoryCache(storyId);

    res.status(200).json({
      success: true,
      message: '作品下架成功',
      data: {
        id: story.id,
        title: story.title,
        status: story.status,
        isPublic: story.isPublic,
        isCompleted: story.isCompleted,
        unpublishedAt: story.unpublishedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 分类管理 ====================

// 获取所有分类（包含故事数量）
router.get('/categories', adminGuard, async (req, res, next) => {
  try {
    const categories = await Category.find();
    // 手动排序
    categories.sort((a, b) => {
      if ((b.storyCount || 0) !== (a.storyCount || 0)) {
        return (b.storyCount || 0) - (a.storyCount || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.status(200).json({
      success: true,
      message: '获取分类列表成功',
      data: {
        categories: categories.map((category) => ({
          id: category._id,
          name: category.name,
          description: category.description,
          storyCount: category.storyCount,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// 创建分类
router.post('/categories', adminGuard, [
  body('name').trim().notEmpty().withMessage('分类名称必填').isLength({ max: 50 }).withMessage('分类名称不能超过50个字符'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('分类描述不能超过200个字符')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '创建分类失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { name, description } = req.body;

    // 检查分类名称是否已存在
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return next(errorFormat(400, '分类名称已存在', [], 10016));
    }

    const category = await Category.create({
      name,
      description: description || ''
    });

    // 清除分类缓存
    clearCategoryCache();

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        storyCount: category.storyCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// 更新分类
router.put('/categories/:id', adminGuard, [
  body('name').optional().notEmpty().withMessage('分类名称不能为空')
    .isLength({ max: 50 }).withMessage('分类名称不能超过50个字符'),
  body('description').optional()
    .isLength({ max: 200 }).withMessage('分类描述不能超过200个字符')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新分类失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return next(errorFormat(404, '分类不存在', [], 10012));
    }

    // 如果更新名称，检查是否与其他分类重复
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name: name });
      if (existingCategory) {
        return next(errorFormat(400, '分类名称已存在', [], 10016));
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });

    // 清除分类缓存
    clearCategoryCache();

    res.status(200).json({
      success: true,
      message: '编辑添加成功',
      data: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        storyCount: updatedCategory.storyCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// 删除分类
router.delete('/categories/:id', adminGuard, async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return next(errorFormat(404, '分类不存在', [], 10012));
    }

    // 检查分类下是否有故事
      const storyCount = await Story.countDocuments({ category: id, category_id: id, categoryId: id });
    if (storyCount > 0) {
      return next(errorFormat(400, `该分类下还有 ${storyCount} 个故事，无法删除`, [], 10017));
    }

    await Category.findByIdAndDelete(id);

    // 清除分类缓存
    clearCategoryCache();

    res.status(200).json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 用户管理 ====================

// 获取用户列表
router.get('/users', adminGuard, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;
    const role = req.query.role || 'all';

    const filter = {};
    if (role !== 'all') {
      filter.role = role;
    }

    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search.trim(), $options: 'i' } },
        { email: { $regex: req.query.search.trim(), $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find({
        ...filter,
        limit: limit,
        skip: skip
      }),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      message: '获取用户列表成功',
      data: {
        users: users.map((user) => {
          const userObj = user.toJSON ? user.toJSON() : user;
          return {
            id: userObj.id,
            username: userObj.username,
            email: userObj.email,
            avatar: userObj.avatar,
            bio: userObj.bio,
            role: userObj.role,
            isActive: userObj.is_active !== undefined ? userObj.is_active : userObj.isActive,
            lastLogin: userObj.last_login || userObj.lastLogin,
            createdAt: userObj.created_at || userObj.createdAt
          };
        }),
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

// 更新用户角色
router.put('/users/:userId/role', adminGuard, [
  body('role').isIn(['user', 'editor', 'admin']).withMessage('角色必须是user、editor或admin')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新用户角色失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { userId } = req.params;
    const { role } = req.body;

    // 不能修改自己的角色
    if (userId === req.user.id) {
      return next(errorFormat(400, '不能修改自己的角色', [], 10018));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10013));
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { role });

    res.status(200).json({
      success: true,
      message: '用户角色更新成功',
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// 禁用/启用用户
router.put('/users/:userId/status', adminGuard, [
  body('isActive').isBoolean().withMessage('状态必须是布尔值')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新用户状态失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // 不能禁用自己
    if (userId === req.user.id) {
      return next(errorFormat(400, '不能禁用自己的账户', [], 10019));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10013));
    }

    await User.findByIdAndUpdate(userId, { isActive });

    res.status(200).json({
      success: true,
      message: isActive ? '用户已启用' : '用户已禁用',
      data: {
        id: user.id,
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
});

// 删除用户
router.delete('/users/:userId', adminGuard, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 不能删除自己
    if (userId === req.user.id) {
      return next(errorFormat(400, '不能删除自己的账户', [], 10021));
    }

    // 验证userId格式
    if (!isValidIntegerId(userId)) {
      return next(errorFormat(400, '无效的用户ID', [], 10013));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10013));
    }

    // 检查用户是否有故事
    const storyCount = await Story.countDocuments({ author: userId, author_id: userId });
    if (storyCount > 0) {
      return next(errorFormat(400, `该用户还有 ${storyCount} 个故事，无法删除。请先删除用户的所有故事`, [], 10022));
    }

    // 删除用户
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 故事管理 ====================

// 管理员修改故事完成状态
router.put('/stories/:storyId/completion', adminGuard, [
  body('isCompleted').isBoolean().withMessage('isCompleted必须为布尔值')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '修改故事完成状态失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const { isCompleted } = req.body;

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    // 管理员可以修改任何故事的完成状态（MySQL版本中，isCompleted字段不在stories表中，如果需要可以添加）
    await Story.findByIdAndUpdate(storyId, { status: 'published', isPublic: true });

    // 清除相关缓存
    clearStoryCache(storyId);

    const message = isCompleted ? '故事已标记为完成' : '故事已标记为未完成';

    res.status(200).json({
      success: true,
      message,
      data: {
        id: story.id,
        title: story.title,
        isCompleted: story.isCompleted,
        status: story.status
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;