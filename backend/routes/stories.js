const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const Category = require('../models/Category');
const StorySection = require('../models/StorySection');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { cacheMiddleware, clearStoryCache } = require('../middleware/cache');

const router = express.Router();

// Stories 路由全局中间件 - 记录所有请求
router.use((req, res, next) => {
  console.log(`📚 STORIES ROUTE: ${req.method} ${req.originalUrl}`);
  console.log('📚 Base URL:', req.baseUrl);
  console.log('📚 Path:', req.path);
  console.log('📚 Params:', req.params);
  next();
});

console.log('=== Stories router loaded ===');

// 测试路由
router.get('/test', (req, res) => {
  console.log('=== /test route matched ===');
  res.json({ message: 'Test route works!' });
});

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
router.get('/', cacheMiddleware(300), async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {};
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

    res.status(200).json({
      success: true,
      message: '获取故事列表成功',
      data: {
        stories: stories.map((story) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          category: story.category,
          author: story.author,
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
  console.log('=== /public route matched WITHOUT cache ===');
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

    res.status(200).json({
      success: true,
      message: '获取公共故事列表成功',
      data: {
        stories: stories.map((story) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          category: story.category,
          author: story.author,
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
          sections: [],
          view: 0,
          rating: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          isTemporary: true
        }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId)
      .populate('author', 'username avatar')
      .populate('category', 'name')
      .populate({
        path: 'sections',
        options: { sort: { order: 1 } }
      });

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    await Story.findByIdAndUpdate(storyId, { $inc: { view: 1 } });

    res.status(200).json({
      success: true,
      message: '获取故事详情成功',
      data: {
        id: story.id,
        title: story.title,
        author: story.author,
        category: story.category,
        coverImage: story.coverImage,
        description: story.description,
        sections: story.sections.map((section) => ({
          id: section.id,
          order: section.order,
          type: section.type,
          text: section.text,
          choices: section.choices,
          isEnd: section.isEnd
        })),
        view: story.view + 1,
        rating: story.rating,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
        isCompleted: story.isCompleted,
        status: story.status,
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
  body('coverImage').optional().isURL().withMessage('封面必须是有效的URL')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '创建故事失败', errors.array().map((err) => ({ field: err.path, message: err.msg })), 10001));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, categoryId, description, coverImage } = req.body;
    const category = await Category.findById(categoryId).session(session);
    if (!category) {
      await session.abortTransaction();
      return next(errorFormat(404, '分类不存在', [], 10012));
    }

    const story = await Story.create([{
      title,
      category: categoryId,
      description,
      coverImage: coverImage || undefined,
      author: req.user.id
    }], { session });

    await Category.updateOne({ _id: categoryId }, { $inc: { storyCount: 1 } }).session(session);

    await session.commitTransaction();
    
    // 清除相关缓存
    clearStoryCache(story[0].id);
    
    res.status(201).json({
      success: true,
      message: '创建故事成功',
      data: {
        id: story[0].id,
        title: story[0].title,
        isTemporary: false
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId).session(session);

    if (!story) {
      await session.abortTransaction();
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
      await session.abortTransaction();
      return next(errorFormat(403, '没有权限修改此故事', [], 10011));
    }

    const updateData = {};

    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.coverImage) updateData.coverImage = req.body.coverImage;

    if (req.body.categoryId && req.body.categoryId !== story.category.toString()) {
      const newCategory = await Category.findById(req.body.categoryId).session(session);
      if (!newCategory) {
        await session.abortTransaction();
        return next(errorFormat(404, '分类不存在', [], 10012));
      }

      await Category.updateOne({ _id: story.category }, { $inc: { storyCount: -1 } }).session(session);
      await Category.updateOne({ _id: newCategory.id }, { $inc: { storyCount: 1 } }).session(session);
      updateData.category = newCategory.id;
    }

    await Story.updateOne({ _id: storyId }, updateData).session(session);

    await session.commitTransaction();
      
      // 清除相关缓存
      clearStoryCache(storyId);
      
      res.status(200).json({ success: true, message: '故事更新成功' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

router.delete('/:storyId', authGuard, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId).session(session);

    if (!story) {
      await session.abortTransaction();
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
      await session.abortTransaction();
      return next(errorFormat(403, '没有权限删除此故事', [], 10011));
    }

    await StorySection.deleteMany({ storyId }).session(session);
    await Story.deleteOne({ _id: storyId }).session(session);
    await Category.updateOne({ _id: story.category }, { $inc: { storyCount: -1 } }).session(session);

    await session.commitTransaction();
    
    // 清除相关缓存
    clearStoryCache(storyId);
    
    res.status(200).json({ success: true, message: '故事及关联章节已删除' });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// 使用缓存中间件，缓存故事图谱，TTL设为2分钟
router.get('/:storyId/graph', cacheMiddleware(120), async (req, res, next) => {
  try {
    const { storyId } = req.params;

    // 对于临时故事，返回空的图谱结构
    if (storyId.startsWith('local_')) {
      return res.status(200).json({
        success: true,
        message: '获取临时故事图谱成功',
        data: {
          story: {
            id: storyId,
            title: '临时故事',
            author: { username: '临时用户', avatar: '' },
            category: { name: '未分类' },
            coverImage: '',
            description: '这是一个临时创建的故事，尚未保存到服务器'
          },
          nodes: [],
          connections: [],
          isTemporary: true
        }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId)
      .populate('author', 'username avatar')
      .populate('category', 'name');

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    const sections = await StorySection.find({ storyId })
      .sort({ order: 1 })
      .populate('choices.nextSectionId', 'id temporaryId title type');

    // 构建节点和连接的数据结构
    const nodes = sections.map(section => ({
      id: section.id,
      temporaryId: section.temporaryId,
      type: section.type,
      order: section.order,
      title: section.title,
      text: section.text,
      visualPosition: section.visualPosition,
      isEnd: section.isEnd,
      statistics: section.statistics
    }));

    // 构建连接关系
    const connections = [];
    sections.forEach(section => {
      if (section.choices && section.choices.length > 0) {
        section.choices.forEach(choice => {
          if (choice.nextSectionId || choice.nextTemporaryId) {
            connections.push({
              id: choice.id || `connection_${section.id}_${connections.length}`,
              sourceId: section.id,
              targetId: choice.nextSectionId ? choice.nextSectionId.toString() : null,
              targetTemporaryId: choice.nextTemporaryId || null,
              choiceText: choice.text,
              choiceDescription: choice.description
            });
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      message: '获取故事图谱成功',
      data: {
        story: {
          id: story.id,
          title: story.title,
          author: story.author,
          category: story.category,
          coverImage: story.coverImage,
          description: story.description
        },
        nodes,
        connections,
        isTemporary: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// 批量保存故事图谱数据
router.put('/:storyId/graph', authGuard, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyId } = req.params;
    const { nodes, metadata = {} } = req.body;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      await session.abortTransaction();
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    // 验证用户权限
    const story = await Story.findById(storyId).session(session);
    if (!story) {
      await session.abortTransaction();
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
      await session.abortTransaction();
      return next(errorFormat(403, '没有权限修改此故事', [], 10011));
    }

    // 验证请求数据
    if (!nodes || !Array.isArray(nodes)) {
      await session.abortTransaction();
      return next(errorFormat(400, '无效的节点数据', [], 10013));
    }

    // 获取现有的章节数据，用于ID映射
    const existingSections = await StorySection.find({ storyId }).session(session);
    const existingSectionMap = new Map();
    const existingTemporaryIdMap = new Map();
    
    existingSections.forEach(section => {
      existingSectionMap.set(section.id.toString(), section);
      if (section.temporaryId) {
        existingTemporaryIdMap.set(section.temporaryId, section.id.toString());
      }
    });

    // 第一阶段：创建临时ID到MongoDB ID的映射关系
    const tempIdToMongoIdMap = new Map();
    
    // 先记录已有的临时ID映射
    existingSections.forEach(section => {
      if (section.temporaryId) {
        tempIdToMongoIdMap.set(section.temporaryId, section.id.toString());
      }
    });

    // 第二阶段：批量处理所有节点
    const updatedSections = [];
    const createdSections = [];
    
    for (const node of nodes) {
      // 验证节点必填字段
      if (!node.temporaryId) {
        await session.abortTransaction();
        return next(errorFormat(400, '每个节点必须有temporaryId', [], 10014));
      }

      // 查找现有章节或创建新章节
      let section;
      let isNewSection = false;
      
      // 尝试通过临时ID找到现有章节
      if (existingTemporaryIdMap.has(node.temporaryId)) {
        const mongoId = existingTemporaryIdMap.get(node.temporaryId);
        section = existingSectionMap.get(mongoId);
      } 
      // 或通过MongoDB ID找到现有章节
      else if (node.id && existingSectionMap.has(node.id)) {
        section = existingSectionMap.get(node.id);
        // 如果有临时ID但还没映射，添加到映射表
        if (!tempIdToMongoIdMap.has(node.temporaryId)) {
          tempIdToMongoIdMap.set(node.temporaryId, node.id);
        }
      } 
      // 创建新章节
      else {
        section = new StorySection({
          storyId,
          temporaryId: node.temporaryId
        });
        isNewSection = true;
      }

      // 更新章节字段
      section.type = node.type || 'text';
      section.order = node.order || 9999;
      section.title = node.title || '';
      section.text = node.text || '';
      section.visualPosition = node.visualPosition || { x: 0, y: 0 };
      section.isEnd = node.isEnd || false;

      // 处理选项和连接关系
      if (node.choices && Array.isArray(node.choices)) {
        section.choices = node.choices.map(choice => {
          const processedChoice = {
            id: choice.id,
            text: choice.text || '',
            description: choice.description || ''
          };

          // 尝试解析目标引用
          if (choice.targetId && mongoose.Types.ObjectId.isValid(choice.targetId)) {
            processedChoice.nextSectionId = choice.targetId;
          }
          // 如果是临时ID引用，暂时只保存临时ID，在保存后再处理映射
          else if (choice.targetTemporaryId) {
            processedChoice.nextTemporaryId = choice.targetTemporaryId;
          }

          return processedChoice;
        });
      } else {
        section.choices = [];
      }

      // 保存章节
      await section.save({ session });
      
      // 记录到映射表（对于新创建的章节）
      if (isNewSection && !tempIdToMongoIdMap.has(node.temporaryId)) {
        tempIdToMongoIdMap.set(node.temporaryId, section.id.toString());
        createdSections.push(section);
      } else if (!isNewSection) {
        updatedSections.push(section);
      }
    }

    // 第三阶段：更新临时ID引用为实际MongoDB ID
    for (const section of [...createdSections, ...updatedSections]) {
      let needUpdate = false;
      
      for (const choice of section.choices) {
        if (choice.nextTemporaryId && tempIdToMongoIdMap.has(choice.nextTemporaryId)) {
          choice.nextSectionId = tempIdToMongoIdMap.get(choice.nextTemporaryId);
          delete choice.nextTemporaryId;
          needUpdate = true;
        }
      }
      
      if (needUpdate) {
        await section.save({ session });
      }
    }

    // 如果提供了元数据，更新故事信息
    if (metadata) {
      const storyUpdates = {};
      if (metadata.title !== undefined) storyUpdates.title = metadata.title;
      if (metadata.description !== undefined) storyUpdates.description = metadata.description;
      if (metadata.coverImage !== undefined) storyUpdates.coverImage = metadata.coverImage;
      
      if (Object.keys(storyUpdates).length > 0) {
        await Story.updateOne({ _id: storyId }, storyUpdates).session(session);
      }
    }

    await session.commitTransaction();
    
    // 清除相关缓存
    clearStoryCache(storyId);

    // 返回更新后的映射信息和操作结果
    res.status(200).json({
      success: true,
      message: '故事图谱保存成功',
      data: {
        temporaryIdMap: Object.fromEntries(tempIdToMongoIdMap),
        updatedCount: updatedSections.length,
        createdCount: createdSections.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// 提交故事审核
router.patch('/:storyId/submit', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
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
  console.log('=== COMPLETE ROUTE HIT ===');
  console.log('Story ID:', req.params.storyId);
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  try {
    const { storyId } = req.params;
    const { isCompleted } = req.body;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    if (typeof isCompleted !== 'boolean') {
      return next(errorFormat(400, 'isCompleted必须为布尔值', [], 10017));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
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

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }

    if (story.author.toString() !== req.user.id) {
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