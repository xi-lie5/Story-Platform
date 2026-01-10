const express = require('express');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const Category = require('../models/Category');
const StoryNode = require('../models/StoryNode');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { cacheMiddleware, clearStoryCache } = require('../middleware/cache');
const { isValidIntegerId } = require('../utils/idValidator');

const router = express.Router();



function buildSortOption(sort = 'latest') {
  switch (sort) {
    case 'popular':
      return { view: -1 };
    case 'rating':
      return { rating: -1 };
    case 'latest':
    default:
      return { createdAt: -1 };
  }
}

// 使用缓存中间件，缓存故事列表，TTL设为5分钟
// 注意：这个端点返回所有已发布的故事（不需要认证）
router.get('/', cacheMiddleware(300), async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip = (page - 1) * limit;

    // 构建过滤条件：只返回已发布的公开故事
    const filter = {
      status: 'published',
      isPublic: true
    };

    if (req.query.category) {
      const category = await Category.findOne({ name: req.query.category });
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10012));
      }
      filter.category = category.id;
    }

    if (req.query.search) {
      filter.$text = { $search: req.query.search.trim() };
    }

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .sort(buildSortOption(req.query.sort))
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .populate('category', 'name'),
      Story.countDocuments(filter)
    ]);
    
    console.log(`获取故事列表: 找到 ${stories.length} 个已发布的故事 (总共 ${total} 个)`);

    res.status(200).json({
      success: true,
      message: '获取故事列表成功',
      data: {
        stories: stories.map((story) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          categoryId: story.category_id,
          authorId: story.author_id,
          coverImage: story.coverImage,
          view: story.view,
          rating: story.rating,
          createdAt: story.createdAt
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

// 使用缓存中间件，缓存公共故事列表，TTL设为5分钟
router.get('/public', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip = (page - 1) * limit;

    const filter = { 
      isPublic: true, 
      status: 'published' 
    };
    
    if (req.query.category) {
      const category = await Category.findOne({ name: req.query.category });
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10012));
      }
      filter.category = category.id;
    }

    // 处理搜索：使用search参数（Story.find会在SQL中使用LIKE查询）
    if (req.query.search && req.query.search.trim()) {
      filter.search = req.query.search.trim();
    }

    // 获取故事列表（带populate）
    const sortOption = buildSortOption(req.query.sort);
    console.log('查询公共故事列表，过滤条件:', filter);
    console.log('排序选项:', sortOption);
    console.log('分页参数: page=', page, 'limit=', limit, 'skip=', skip);
    
    const stories = await Story.find(filter, {
      sort: sortOption,
      skip: skip,
      limit: limit,
      populate: ['author', 'category']
    });

    const total = await Story.countDocuments(filter);
    
    console.log(`查询结果: 找到 ${stories.length} 个故事，总共 ${total} 个`);
    
    // 如果有搜索，显示排序后的故事标题（用于验证排序是否正确）
    if (filter.search) {
      console.log('搜索结果排序（标题匹配优先于描述匹配）:');
      stories.forEach((story, index) => {
        const titleMatch = story.title && story.title.toLowerCase().includes(filter.search.toLowerCase());
        const descMatch = story.description && story.description.toLowerCase().includes(filter.search.toLowerCase());
        console.log(`  [${index + 1}] ${story.title} - 标题匹配: ${titleMatch}, 描述匹配: ${descMatch}`);
      });
    }
    
    // 检查数据库中所有故事的状态分布（用于调试）
    try {
      const { pool } = require('../config/database');
      const connection = await pool.getConnection();
      try {
        const [statusCounts] = await connection.execute(
          'SELECT status, is_public, COUNT(*) as count FROM stories GROUP BY status, is_public ORDER BY status, is_public'
        );
        console.log('数据库中故事状态分布:', statusCounts);
        
        // 检查是否有已发布且公开的故事
        const [publishedCount] = await connection.execute(
          'SELECT COUNT(*) as count FROM stories WHERE status = ? AND is_public = ?',
          ['published', 1]
        );
        console.log('已发布且公开的故事数量:', publishedCount[0].count);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取故事状态分布失败:', error.message);
    }

    res.status(200).json({
      success: true,
      message: '获取公共故事列表成功',
      data: {
        stories: stories.map((story) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          categoryId: story.category_id,
          authorId: story.author_id,
          coverImage: story.cover_image || story.coverImage || '/coverImage/1.png',
          view: story.view_count || story.view || 0,
          rating: story.rating || 0,
          createdAt: story.created_at || story.createdAt,
          // 包含author和category的完整信息
          author: story.author ? {
            id: story.author.id,
            username: story.author.username || '未知作者',
            avatar: story.author.avatar || '/avatar/default.png'
          } : { id: null, username: '未知作者', avatar: '/avatar/default.png' },
          category: story.category ? {
            id: story.category.id,
            name: story.category.name || '未分类'
          } : { id: null, name: '未分类' }
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

// 使用缓存中间件，缓存故事详情，TTL设为3分钟
router.get('/:storyId', cacheMiddleware(180), async (req, res, next) => {
  try {
    const { storyId } = req.params;

    // 对于临时故事，返回基本信息
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        message: '获取临时故事详情成功',
        data: {
          id: storyId,
          title: '临时故事',
          author: { username: '临时用户', avatar: '' },
          category: { name: '未分类' },
          coverImage: '',
          description: '这是一个临时创建的故事，尚未保存到服务器',
          nodes: [],
          view: 0,
          rating: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isTemporary: true
        }
      });
    }

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    // 验证storyId格式
    const storyIdInt = parseInt(storyId, 10);
    if (isNaN(storyIdInt)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    // 获取故事基本信息
    const story = await Story.findById(storyIdInt);

    if (!story) {
      console.log(`故事不存在: ${storyIdInt}`);
      return next(errorFormat(404, '故事不存在', [], 10010));
    }
    
    console.log(`获取故事详情: ${story.title} (ID: ${story.id}, Status: ${story.status})`);

    // 获取作者和分类信息
    const User = require('../models/User');
    const Category = require('../models/Category');
    const author = story.author_id ? await User.findById(story.author_id) : null;
    const category = story.category_id ? await Category.findById(story.category_id) : null;

    // 获取故事所有节点（用于统计总节点数）
    const StoryNode = require('../models/StoryNode');
    const allNodes = await StoryNode.getStoryNodes(storyIdInt);

    // 更新浏览量（增加1）- 直接使用SQL更新
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE stories SET view_count = view_count + 1 WHERE id = ?',
        [storyIdInt]
      );
    } finally {
      connection.release();
    }
    
    // 重新获取故事以获取更新后的view_count
    const updatedStory = await Story.findById(storyIdInt);

    res.status(200).json({
      success: true,
      message: '获取故事详情成功',
      data: {
        id: story.id,
        title: story.title,
        authorId: story.author_id,
        categoryId: story.category_id,
        coverImage: story.cover_image || story.coverImage || '/coverImage/1.png',
        description: story.description,
        view: updatedStory?.view_count || story.view_count || 0,
        rating: story.rating || 0,
        createdAt: story.created_at || story.createdAt,
        updatedAt: story.updated_at || story.updatedAt,
        status: story.status,
        isPublic: story.is_public || false,
        // 包含author和category的完整信息
        author: author ? {
          id: author.id,
          username: author.username || '未知作者',
          avatar: author.avatar || '/avatar/default.png'
        } : { id: null, username: '未知作者', avatar: '/avatar/default.png' },
        category: category ? {
          id: category.id,
          name: category.name || '未分类'
        } : { id: null, name: '未分类' },
        // 节点总数（用于进度计算）
        totalNodes: allNodes.length,
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authGuard, [
  body('title').trim().notEmpty().withMessage('故事标题必填').isLength({ max: 100 }).withMessage('标题不能超过100个字符'),
  body('categoryId').notEmpty().withMessage('分类ID必填'),
  body('description').trim().notEmpty().withMessage('故事简介必填').isLength({ max: 500 }).withMessage('简介不能超过500个字符'),
  body('coverImage').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (value && value.trim() !== '') {
      // 如果提供了coverImage，验证它是否是有效的URL或路径
      const urlPattern = /^https?:\/\//;
      const pathPattern = /^\/[^\s]*$/;
      if (!urlPattern.test(value) && !pathPattern.test(value)) {
        throw new Error('封面必须是有效的URL或路径');
      }
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '创建故事失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { title, categoryId, description, coverImage } = req.body;
    
    console.log('创建故事请求:', { title, categoryId, author: req.user.id });
    
    // 检查分类是否存在
    const category = await Category.findById(categoryId);
    if (!category) {
      return next(errorFormat(404, '分类不存在', [], 10012));
    }

    // 创建故事（默认状态为 draft）
    // 确保categoryId是数字类型
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) {
      return next(errorFormat(400, '无效的分类ID', [], 10012));
    }
    
    const story = await Story.create({
      title,
      category: categoryIdNum,  // 使用数字类型的categoryId
      categoryId: categoryIdNum,  // 同时支持两种字段名
      description,
      coverImage: coverImage || undefined,
      author: req.user.id,
      status: 'draft', // 明确设置为草稿状态
      isPublic: false // 草稿默认不公开
    });

    // story是数据库原始行对象，字段名是下划线格式
    const storyId = story.id || story.story_id;
    const storyStatus = story.status || 'draft';
    
    console.log('故事创建成功:', { 
      id: storyId, 
      title: story.title, 
      status: storyStatus, 
      author: story.author_id 
    });

    // 更新分类的故事数量
    await Category.updateStoryCount(categoryId, 1);
    
    // 注意：不再自动创建根节点，节点和分支由前端通过批量保存API保存
    
    // 清除相关缓存
    clearStoryCache(storyId);
    
    res.status(201).json({
      success: true,
      message: '创建故事成功',
      data: {
        id: storyId,
        title: story.title,
        status: storyStatus,
        isTemporary: false
      }
    });
  } catch (error) {
    console.error('创建故事失败:', error);
    console.error('错误堆栈:', error.stack);
    // 如果创建过程中出错，尝试清理已创建的数据
    if (error.name === 'ValidationError' || error.code === 11000) {
      return next(errorFormat(400, error.message || '创建故事失败', [], 10001));
    }
    next(error);
  }
});

router.put('/:storyId', authGuard, [
  body('title').optional().trim().notEmpty().withMessage('故事标题不能为空'),
  body('description').optional().trim().notEmpty().withMessage('故事简介不能为空'),
  body('categoryId').optional().notEmpty().withMessage('分类ID不能为空'),
  body('coverImage').optional().isURL().withMessage('封面必须是有效的URL')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新故事失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const story = await Story.findById(parseInt(storyId));

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, '没有权限修改此故事', [], 10011));
    }

    const updateData = {};

    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

    if (req.body.categoryId && req.body.categoryId !== story.category_id?.toString()) {
      const newCategory = await Category.findById(req.body.categoryId);
      if (!newCategory) {
        return next(errorFormat(404, '分类不存在', [], 10012));
      }

      // 更新分类的故事数量
      if (story.category_id) {
        await Category.updateStoryCount(story.category_id, -1);
      }
      await Category.updateStoryCount(newCategory.id, 1);
      updateData.categoryId = newCategory.id;
    }

    await Story.findByIdAndUpdate(parseInt(storyId), updateData);
      
    // 清除相关缓存
    clearStoryCache(storyId);
      
    res.status(200).json({ success: true, message: '故事更新成功' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:storyId', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(parseInt(storyId));

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, '没有权限删除此故事', [], 10011));
    }

    // 删除故事（会触发级联删除节点、分支、角色）
    await Story.findByIdAndDelete(parseInt(storyId));
    
    // 更新分类的故事数量
    if (story.category_id) {
      await Category.updateStoryCount(story.category_id, -1);
    }
    
    // 清除相关缓存
    clearStoryCache(storyId);
    
    res.status(200).json({ success: true, message: '故事及关联章节已删除' });
  } catch (error) {
    next(error);
  }
});





// 提交故事审核
router.patch('/:storyId/submit', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, '没有权限提交此故事', [], 10011));
    }

    if (story.status !== 'draft' && story.status !== 'rejected') {
      return next(errorFormat(400, '只有草稿或被拒绝的故事才能提交审核', [], 10015));
    }

    // 更新故事状态为待审核
    story.status = 'pending';
    story.submittedAt = new Date();
    await story.save();

    // 清除相关缓存
    clearStoryCache(storyId);

    res.status(200).json({
      success: true,
      message: '故事提交审核成功',
      data: {
        id: story.id,
        title: story.title,
        status: story.status,
        submittedAt: story.submittedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// 标记故事为完成/未完成
router.patch('/:storyId/complete', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { isCompleted } = req.body;

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    if (typeof isCompleted !== 'boolean') {
      return next(errorFormat(400, 'isCompleted必须为布尔值', [], 10017));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, '没有权限修改此故事', [], 10011));
    }

    // 更新故事的完成状态
    story.isCompleted = isCompleted;
    await story.save();

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



// 取消发布故事
router.patch('/:storyId/unpublish', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, '没有权限取消发布此故事', [], 10011));
    }

    if (story.status !== 'published') {
      return next(errorFormat(400, '故事未发布', [], 10016));
    }

    // 更新故事状态为草稿，并自动取消标记完成
    story.status = 'draft';
    story.isCompleted = false; // 自动取消标记完成
    await story.save();

    // 清除相关缓存
    clearStoryCache(storyId);

    res.status(200).json({
      success: true,
      message: '故事取消发布成功',
      data: {
        id: story.id,
        title: story.title,
        status: story.status,
        isCompleted: story.isCompleted
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;