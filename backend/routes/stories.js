const express = require('express');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const Category = require('../models/Category');
const StoryNode = require('../models/StoryNode');
const StoryComment = require('../models/StoryComment');
const StoryReadEvent = require('../models/StoryReadEvent');
const Branch = require('../models/Branch');
const User = require('../models/User');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { cacheMiddleware, clearStoryCache } = require('../middleware/cache');
const { isValidIntegerId } = require('../utils/idValidator');
const { buildExportData, writePdfExport, writeEpubExport } = require('../services/storyExport');

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


router.get('/:storyId/comments', async (req, res, next) => {
  try {
    const { storyId } = req.params;
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, 'Invalid story ID', [], 10002));
    }

    const story = await Story.findById(parseInt(storyId, 10));
    if (!story) {
      return next(errorFormat(404, 'Story not found', [], 10012));
    }

    const result = await StoryComment.findByStory(parseInt(storyId, 10), {
      page: req.query.page,
      limit: req.query.limit,
      nodeId: req.query.nodeId || null
    });

    res.json({
      success: true,
      message: 'Comments loaded successfully',
      data: result.comments,
      pagination: result.pagination
    });
  } catch (error) {
    return next(errorFormat(500, 'Failed to load comments', [{ message: error.message }], 10004));
  }
});

router.post('/:storyId/comments', authGuard, [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment content must be 1-2000 characters'),
  body('nodeId').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 255 }).withMessage('Invalid node ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errorFormat(400, 'Invalid comment data', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
    }

    const { storyId } = req.params;
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, 'Invalid story ID', [], 10002));
    }

    const story = await Story.findById(parseInt(storyId, 10));
    if (!story) {
      return next(errorFormat(404, 'Story not found', [], 10012));
    }

    const comment = await StoryComment.create({
      storyId: parseInt(storyId, 10),
      userId: req.user.id,
      nodeId: req.body.nodeId || null,
      content: req.body.content
    });

    clearStoryCache(storyId);
    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment
    });
  } catch (error) {
    return next(errorFormat(500, 'Failed to create comment', [{ message: error.message }], 10004));
  }
});
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
      return next(errorFormat(404, 'Resource not found', [], 10012));
      }
      filter.category = category.id;
    }

    if (req.query.search) {
      filter.$text = { $search: req.query.search.trim() };
    }

    const findOptions = {
      sort: buildSortOption(req.query.sort),
      skip: skip,
      limit: limit,
      populate: ['author', 'category']
    };
    const [stories, total] = await Promise.all([
      Story.find(filter, findOptions),
      Story.countDocuments(filter)
    ]);

    console.log(`获取故事列表: 找到 ${stories.length} 篇已发布的故事 (总共 ${total} 篇)`);

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
      return next(errorFormat(404, 'Resource not found', [], 10012));
      }
      filter.category = category.id;
    }

    if (req.query.search && req.query.search.trim()) {
      filter.search = req.query.search.trim();
    }

    // 类型筛选：manual 手动创作 / ai AI 互动
    if (req.query.type === 'manual' || req.query.type === 'ai') {
      filter.creation_mode = req.query.type;
    }

    // 完结状态筛选：1 已完结（存在 type='end' 的结局节点）/ 0 连载中（无结局节点）
    if (req.query.completed === '1' || req.query.completed === '0') {
      filter.hasEnding = req.query.completed === '1';
    }

    const sortOption = buildSortOption(req.query.sort);
    console.log('查询公共故事列表，过滤条件', filter);
    console.log('排序选项:', sortOption);
    console.log('分页参数: page=', page, 'limit=', limit, 'skip=', skip);

    const stories = await Story.find(filter, {
      sort: sortOption,
      skip: skip,
      limit: limit,
      populate: ['author', 'category']
    });

    const total = await Story.countDocuments(filter);

    console.log(`Public stories query returned ${stories.length} rows, total=${total}`);

    // 如果有搜索，显示排序后的故事标题（用于验证排序是否正确）
    if (filter.search) {
      console.log('搜索结果排序（标题匹配优先于描述匹配）');
      stories.forEach((story, index) => {
        const titleMatch = story.title && story.title.toLowerCase().includes(filter.search.toLowerCase());
        const descMatch = story.description && story.description.toLowerCase().includes(filter.search.toLowerCase());
        console.log(`  [${index + 1}] ${story.title} - 标题匹配: ${titleMatch}, 描述匹配: ${descMatch}`);
      });
    }

    try {
      const { pool } = require('../config/database');
      const connection = await pool.getConnection();
      try {
        const [statusCounts] = await connection.execute(
          'SELECT status, is_public, COUNT(*) as count FROM stories GROUP BY status, is_public ORDER BY status, is_public'
        );
        console.log('数据库中故事状态分布', statusCounts);

        const [publishedCount] = await connection.execute(
          'SELECT COUNT(*) as count FROM stories WHERE status = ? AND is_public = ?',
          ['published', 1]
        );
        console.log('已发布且公开的故事数量', publishedCount[0].count);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取故事状态分布失败', error.message);
    }

    // 批量统计每个故事的评论数（一次查询，避免 N+1）
    const publicStoryIds = stories.map((s) => s.id).filter(Boolean);
    const commentCountMap = {};
    if (publicStoryIds.length) {
      try {
        const { pool } = require('../config/database');
        const [ccRows] = await pool.query(
          `SELECT story_id, COUNT(*) AS cnt FROM story_comments WHERE story_id IN (${publicStoryIds.map(() => '?').join(',')}) GROUP BY story_id`,
          publicStoryIds
        );
        ccRows.forEach((r) => { commentCountMap[r.story_id] = Number(r.cnt); });
      } catch (e) { /* 评论表异常不影响列表返回 */ }
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
          commentCount: commentCountMap[story.id] || 0,
          createdAt: story.created_at || story.createdAt,
          author: story.author ? {
            id: story.author.id,
            username: story.author.username || 'Unknown author',
            avatar: story.author.avatar || '/avatar/default.png'
          } : { id: null, username: 'Unknown author', avatar: '/avatar/default.png' },
          category: story.category ? {
            id: story.category.id,
            name: story.category.name || 'Uncategorized'
          } : { id: null, name: 'Uncategorized' }
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


router.post('/:storyId/read-events', authGuard, [
  body('toNodeId').trim().isLength({ min: 1, max: 255 }).withMessage('toNodeId is required'),
  body('fromNodeId').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 255 }).withMessage('Invalid fromNodeId'),
  body('choiceText').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 500 }).withMessage('choiceText cannot exceed 500 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(errorFormat(400, 'Invalid read event data', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
    }

    const { storyId } = req.params;
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, 'Invalid story ID', [], 10002));
    }

    const story = await Story.findById(parseInt(storyId, 10));
    if (!story) {
      return next(errorFormat(404, 'Story not found', [], 10012));
    }

    await StoryReadEvent.create({
      storyId: parseInt(storyId, 10),
      userId: req.user.id,
      sessionId: req.body.sessionId || null,
      fromNodeId: req.body.fromNodeId || null,
      toNodeId: req.body.toNodeId,
      choiceText: req.body.choiceText || null
    });

    res.status(201).json({ success: true, message: 'Read event recorded' });
  } catch (error) {
    return next(errorFormat(500, 'Failed to record read event', [{ message: error.message }], 10004));
  }
});

router.get('/:storyId/analytics', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, 'Invalid story ID', [], 10002));
    }

    const story = await Story.findById(parseInt(storyId, 10));
    if (!story) {
      return next(errorFormat(404, 'Story not found', [], 10012));
    }

    const isAuthor = String(story.author_id || story.author) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return next(errorFormat(403, 'Only the author can view story analytics', [], 10005));
    }

    const data = await StoryReadEvent.getAnalytics(parseInt(storyId, 10));
    res.status(200).json({ success: true, data });
  } catch (error) {
    return next(errorFormat(500, 'Failed to load story analytics', [{ message: error.message }], 10004));
  }
});
router.get('/:storyId/export', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const format = String(req.query.format || 'pdf').toLowerCase();

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, 'Invalid story ID', [], 10002));
    }
    if (!['pdf', 'epub'].includes(format)) {
      return next(errorFormat(400, 'Unsupported export format', [{ field: 'format', message: 'format must be pdf or epub' }], 10001));
    }

    const numericStoryId = parseInt(storyId, 10);
    const story = await Story.findById(numericStoryId);
    if (!story) {
      return next(errorFormat(404, 'Story not found', [], 10012));
    }

    const [author, nodes, branches] = await Promise.all([
      story.author_id ? User.findById(story.author_id) : Promise.resolve(null),
      StoryNode.getStoryNodes(numericStoryId),
      Branch.getStoryBranches(numericStoryId)
    ]);

    const exportData = buildExportData({ story, author, nodes, branches });
    if (format === 'pdf') {
      writePdfExport(exportData, res);
      return;
    }

    await writeEpubExport(exportData, res);
  } catch (error) {
    return next(errorFormat(500, 'Failed to export story', [{ message: error.message }], 10004));
  }
});
router.get('/:storyId', cacheMiddleware(180), async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        message: '获取临时故事详情成功',
        data: {
          id: storyId,
          title: '临时故事',
          author: { username: '临时用户', avatar: '' },
          name: 'Uncategorized',
          coverImage: '',
          description: 'Temporary story not saved to server',
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
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    console.log(`获取故事详情: ${story.title} (ID: ${story.id}, Status: ${story.status})`);

    // 获取作者和分类信息
    const User = require('../models/User');
    const Category = require('../models/Category');
    const author = story.author_id ? await User.findById(story.author_id) : null;
    const category = story.category_id ? await Category.findById(story.category_id) : null;

    const StoryNode = require('../models/StoryNode');
    const allNodes = await StoryNode.getStoryNodes(storyIdInt);

    // 更新浏览量（增加1） 直接使用SQL更新
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
        author: author ? {
          id: author.id,
          username: author.username || 'Unknown author',
          avatar: author.avatar || '/avatar/default.png'
        } : { id: null, username: 'Unknown author', avatar: '/avatar/default.png' },
        category: category ? {
          id: category.id,
          name: category.name || 'Uncategorized'
        } : { id: null, name: 'Uncategorized' },
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
  body('title').trim().notEmpty().withMessage('Story title is required').isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('categoryId').notEmpty().withMessage('Category ID is required'),
  body('description').trim().notEmpty().withMessage('Story description is required').isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('coverImage').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (value && value.trim() !== '') {
      const urlPattern = /^https?:\/\//;
      const pathPattern = /^\/[^\s]*$/;
      if (!urlPattern.test(value) && !pathPattern.test(value)) {
        throw new Error('Cover must be a valid URL or path');
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

    const category = await Category.findById(categoryId);
    if (!category) {
      return next(errorFormat(404, 'Resource not found', [], 10012));
    }

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

    const storyId = story.id || story.story_id;
    const storyStatus = story.status || 'draft';

    console.log('故事创建成功:', {
      id: storyId,
      title: story.title,
      status: storyStatus,
      author: story.author_id
    });

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
  body('description').optional().trim().notEmpty().withMessage('Story description cannot be empty'),
  body('categoryId').optional().notEmpty().withMessage('分类ID不能为空'),
  body('coverImage').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (value && value.trim() !== '') {
      const urlPattern = /^https?:\/\//;
      const pathPattern = /^\/[^\s]*$/;
      if (!urlPattern.test(value) && !pathPattern.test(value)) {
        throw new Error('Cover must be a valid URL or path');
      }
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '更新故事失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  try {
    const { storyId } = req.params;
    const story = await Story.findById(parseInt(storyId));

    if (!story) {
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, 'Permission denied', [], 10011));
    }

    const updateData = {};

    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

    if (req.body.categoryId && req.body.categoryId !== story.category_id?.toString()) {
      const newCategory = await Category.findById(req.body.categoryId);
      if (!newCategory) {
      return next(errorFormat(404, 'Resource not found', [], 10012));
      }

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
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, 'Permission denied', [], 10011));
    }

    // 删除故事（会触发级联删除节点、分支、角色）
    await Story.findByIdAndDelete(parseInt(storyId));

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
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, 'Permission denied', [], 10011));
    }

    if (story.status !== 'draft' && story.status !== 'rejected') {
      return next(errorFormat(400, 'Invalid request', [], 10015));
    }

    const updatedStory = await Story.findByIdAndUpdate(parseInt(storyId), {
      status: 'pending'
    });

    if (!updatedStory) {
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    console.log(`[SUBMIT] 故事 ${storyId} 状态已更新为: ${updatedStory.status}`);

    // 清除相关缓存
    clearStoryCache(storyId);

    // 清除用户故事列表缓存（确保前端刷新时获取最新数据）
    const { clearUserCache } = require('../middleware/cache');
    clearUserCache(story.author_id);
    console.log(`[SUBMIT] Cleared story list cache for author ${story.author_id}`);

    res.status(200).json({
      success: true,
      message: '故事提交审核成功',
      data: {
        id: updatedStory.id,
        title: updatedStory.title,
        status: updatedStory.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// Toggle story completion status.
router.patch('/:storyId/complete', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { isCompleted } = req.body;

    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    if (typeof isCompleted !== 'boolean') {
      return next(errorFormat(400, 'Invalid request', [], 10017));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, 'Permission denied', [], 10011));
    }

    // 更新故事的完成状态
    story.isCompleted = isCompleted;
    await story.save();

    // 清除相关缓存
    clearStoryCache(storyId);

    const message = isCompleted ? 'Story marked completed' : 'Story marked incomplete';

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
      return next(errorFormat(404, 'Resource not found', [], 10010));
    }

    if (story.author_id.toString() !== req.user.id.toString()) {
      return next(errorFormat(403, 'Permission denied', [], 10011));
    }

    if (story.status !== 'published') {
      return next(errorFormat(400, 'Invalid request', [], 10016));
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
