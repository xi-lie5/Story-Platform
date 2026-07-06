const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { chatCompletion } = require('../utils/deepseekClient');
const { buildSystemPrompt, buildContinuationMessages } = require('../utils/aiPromptBuilder');
const AiStory = require('../models/AiStory');

const router = express.Router();

// =============================================
// Section 1: Rulebook Config Endpoints
// =============================================

/**
 * POST /config — Create rulebook (workshop saves config, NO chapter generation)
 */
router.post('/config', authGuard, [
  body('title').trim().notEmpty().withMessage('标题不能为空').isLength({ max: 100 }),
  body('worldSetting').trim().notEmpty().withMessage('世界观设定不能为空'),
  body('startPrompt').trim().notEmpty().withMessage('开端提示不能为空'),
  body('characters').isArray({ min: 1 }).withMessage('至少需要一个角色'),
  body('outline').optional().trim(),
  body('style').optional(),
  body('moodTags').optional().isArray(),
  body('category_id').optional().isInt(),
  body('description').optional().trim()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const config = await AiStory.create({
      title: req.body.title,
      author_id: req.user.id,
      world_setting: req.body.worldSetting,
      start_prompt: req.body.startPrompt,
      outline: req.body.outline,
      style: req.body.style,
      mood_tags: req.body.moodTags,
      characters_config: req.body.characters,
      category_id: req.body.category_id,
      description: req.body.description
    });

    res.status(201).json({
      success: true,
      message: '规则书创建成功',
      data: { id: config.id, title: config.title }
    });
  } catch (error) {
    console.error('规则书创建失败:', error);
    next(errorFormat(500, '规则书创建失败: ' + error.message, [], 10013));
  }
});

/**
 * PUT /config/:id — Edit rulebook (partial update)
 */
router.put('/config/:id', authGuard, [
  param('id').isUUID().withMessage('ID 格式不正确'),
  body('title').optional().trim().isLength({ max: 100 }),
  body('worldSetting').optional().trim(),
  body('startPrompt').optional().trim(),
  body('outline').optional().trim(),
  body('style').optional(),
  body('moodTags').optional().isArray(),
  body('characters').optional().isArray({ min: 1 }),
  body('category_id').optional().isInt(),
  body('description').optional().trim()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const config = await AiStory.findById(req.params.id);
    if (!config) {
      return next(errorFormat(404, '规则书不存在', [], 10002));
    }
    if (config.author_id !== req.user.id) {
      return next(errorFormat(403, '无权编辑此规则书', [], 10003));
    }

    // Map frontend camelCase fields to model snake_case fields
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.worldSetting !== undefined) updateData.world_setting = req.body.worldSetting;
    if (req.body.startPrompt !== undefined) updateData.start_prompt = req.body.startPrompt;
    if (req.body.outline !== undefined) updateData.outline = req.body.outline;
    if (req.body.style !== undefined) updateData.style = req.body.style;
    if (req.body.moodTags !== undefined) updateData.mood_tags = req.body.moodTags;
    if (req.body.characters !== undefined) updateData.characters_config = req.body.characters;
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.description !== undefined) updateData.description = req.body.description;

    const updated = await AiStory.update(req.params.id, updateData);

    res.json({
      success: true,
      message: '规则书更新成功',
      data: updated
    });
  } catch (error) {
    console.error('规则书更新失败:', error);
    next(errorFormat(500, '规则书更新失败: ' + error.message, [], 10013));
  }
});

/**
 * GET /configs — Public marketplace listing (NO auth required)
 */
router.get('/configs', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional().isInt(),
  query('search').optional().trim()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const result = await AiStory.findPublic({
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category,
      search: req.query.search
    });

    res.json({
      success: true,
      data: result.stories,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('获取广场列表失败:', error);
    next(errorFormat(500, '获取列表失败: ' + error.message, [], 10013));
  }
});

/**
 * GET /configs/my — My rulebooks (authGuard required)
 * MUST be defined before /configs/:id to avoid "my" being matched as :id
 */
router.get('/configs/my', authGuard, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['draft', 'published', 'unpublished', 'all'])
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const result = await AiStory.findByAuthor(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status
    });

    res.json({
      success: true,
      data: result.stories,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('获取我的规则书失败:', error);
    next(errorFormat(500, '获取列表失败: ' + error.message, [], 10013));
  }
});

/**
 * GET /configs/:id — Single rulebook detail (no auth required, public)
 */
router.get('/configs/:id', [
  param('id').isUUID().withMessage('ID 格式不正确')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const config = await AiStory.findById(req.params.id);
    if (!config) {
      return next(errorFormat(404, '规则书不存在', [], 10002));
    }

    // Increment view count (fire and forget)
    AiStory.incrementViews(req.params.id).catch(() => {});

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取规则书详情失败:', error);
    next(errorFormat(500, '获取详情失败: ' + error.message, [], 10013));
  }
});

/**
 * PATCH /configs/:id/publish — Publish or unpublish a rulebook
 */
router.patch('/configs/:id/publish', authGuard, [
  param('id').isUUID().withMessage('ID 格式不正确'),
  body('action').isIn(['publish', 'unpublish']).withMessage('操作类型无效，必须为 publish 或 unpublish')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const config = await AiStory.findById(req.params.id);
    if (!config) {
      return next(errorFormat(404, '规则书不存在', [], 10002));
    }
    if (config.author_id !== req.user.id) {
      return next(errorFormat(403, '无权操作此规则书', [], 10003));
    }

    const isPublish = req.body.action === 'publish';
    const updated = await AiStory.setPublishStatus(req.params.id, {
      status: isPublish ? 'published' : 'unpublished',
      isPublic: isPublish
    });

    res.json({
      success: true,
      message: isPublish ? '发布成功' : '下架成功',
      data: updated
    });
  } catch (error) {
    console.error('发布状态变更失败:', error);
    next(errorFormat(500, '操作失败: ' + error.message, [], 10013));
  }
});

/**
 * DELETE /configs/:id — Delete rulebook and cascade sessions
 */
router.delete('/configs/:id', authGuard, [
  param('id').isUUID().withMessage('ID 格式不正确')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const config = await AiStory.findById(req.params.id);
    if (!config) {
      return next(errorFormat(404, '规则书不存在', [], 10002));
    }
    if (config.author_id !== req.user.id) {
      return next(errorFormat(403, '无权删除此规则书', [], 10003));
    }

    await AiStory.delete(req.params.id);

    res.json({
      success: true,
      message: '规则书已删除'
    });
  } catch (error) {
    console.error('删除规则书失败:', error);
    next(errorFormat(500, '删除失败: ' + error.message, [], 10013));
  }
});

// =============================================
// Section 2: Game Session Endpoints
// =============================================

/**
 * POST /configs/:id/start — Start a new adventure session
 * Loads rulebook, calls DeepSeek for chapter 1, creates story/session records
 */
router.post('/configs/:id/start', authGuard, [
  param('id').isUUID().withMessage('ID 格式不正确')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Load rulebook config
    const config = await AiStory.findById(req.params.id);
    if (!config) {
      await conn.rollback();
      conn.release();
      return next(errorFormat(404, '规则书不存在', [], 10002));
    }

    // 2. Build story config for AI prompt
    const storyConfig = {
      title: config.title,
      worldSetting: config.world_setting,
      characters: config.characters_config,
      outline: config.outline,
      style: config.style
    };

    // 3. Build system prompt and generate chapter 1 via DeepSeek
    const systemPrompt = buildSystemPrompt(storyConfig);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请作为本章的开端，根据以下提示生成第一章内容：\n' + config.start_prompt }
    ];

    const generatedText = await chatCompletion(messages, { temperature: 0.85, max_tokens: 4096 });

    // 4. Parse AI response as JSON
    let parsed;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.warn('AI 返回内容 JSON 解析失败，使用纯文本模式');
      parsed = null;
    }

    const nodeContent = parsed?.content || generatedText;
    const nodeTitle = parsed?.title || '第一章';
    const choices = parsed?.choices || [];

    // 5. Create story record in stories table
    const [storyResult] = await conn.execute(
      `INSERT INTO stories (title, author_id, category_id, description, status, is_public, creation_mode, ai_config)
       VALUES (?, ?, ?, ?, 'draft', FALSE, 'ai', ?)`,
      [config.title, req.user.id, config.category_id || null,
       config.start_prompt.substring(0, 500), JSON.stringify(storyConfig)]
    );
    const storyId = storyResult.insertId;

    // 6. Save character cards
    if (config.characters_config && config.characters_config.length > 0) {
      for (const char of config.characters_config) {
        await conn.execute(
          `INSERT INTO ai_story_characters (story_id, name, personality_tags, description, relationships, avatar_prompt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            storyId,
            char.name,
            JSON.stringify(char.personality_tags || []),
            char.description || '',
            JSON.stringify(char.relationships || {}),
            char.avatar_prompt || ''
          ]
        );
      }
    }

    // 7. Create root node
    const rootNodeId = uuidv4();
    await conn.execute(
      `INSERT INTO story_nodes (id, story_id, title, content, is_root, type)
       VALUES (?, ?, ?, ?, TRUE, 'regular')`,
      [rootNodeId, storyId, nodeTitle, nodeContent]
    );

    // 8. Create choice nodes and branches
    const branchLinks = [];
    for (const choice of choices) {
      const nodeId = uuidv4();
      await conn.execute(
        `INSERT INTO story_nodes (id, story_id, title, content, type)
         VALUES (?, ?, ?, '', 'branch')`,
        [nodeId, storyId, choice.text]
      );
      const branchId = uuidv4();
      await conn.execute(
        `INSERT INTO branches (id, source_node_id, target_node_id, context)
         VALUES (?, ?, ?, ?)`,
        [branchId, rootNodeId, nodeId, choice.text]
      );
      branchLinks.push({ id: branchId, nodeId, text: choice.text, hint: choice.hint });
    }

    // 9. Create session
    await conn.execute(
      `INSERT INTO ai_story_sessions (story_id, user_id, context_messages, current_node_id, total_nodes)
       VALUES (?, ?, ?, ?, ?)`,
      [storyId, req.user.id, JSON.stringify(messages), rootNodeId, 1 + choices.length]
    );

    // 10. Increment rulebook session count
    await AiStory.incrementSessions(req.params.id);

    await conn.commit();

    res.status(201).json({
      success: true,
      message: '冒险开始',
      data: {
        storyId,
        configId: req.params.id,
        rootNodeId,
        title: nodeTitle,
        content: nodeContent,
        choices: branchLinks,
        totalNodes: 1 + choices.length
      }
    });
  } catch (error) {
    await conn.rollback();
    console.error('开始冒险失败:', error);
    next(errorFormat(500, '开始冒险失败: ' + error.message, [], 10013));
  } finally {
    conn.release();
  }
});

/**
 * POST /story/:storyId/generate — Continue story (PRESERVED from original logic)
 */
router.post('/story/:storyId/generate', authGuard, [
  param('storyId').isInt(),
  body('nodeId').trim().notEmpty().withMessage('当前节点ID不能为空'),
  body('choice').trim().notEmpty().withMessage('选择文本不能为空')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { storyId } = req.params;
    const { nodeId, choice } = req.body;

    // 1. Get story config
    const [stories] = await conn.execute('SELECT * FROM stories WHERE id = ?', [storyId]);
    if (stories.length === 0) {
      return next(errorFormat(404, '故事不存在', [], 10002));
    }
    const story = stories[0];
    const aiConfig = story.ai_config ? (typeof story.ai_config === 'string' ? JSON.parse(story.ai_config) : story.ai_config) : {};
    const storyConfig = { title: story.title, category: null, ...aiConfig };

    // 2. Get session
    const [sessions] = await conn.execute(
      'SELECT * FROM ai_story_sessions WHERE story_id = ? AND user_id = ?',
      [storyId, req.user.id]
    );
    const session = sessions.length > 0 ? sessions[0] : null;
    const history = session?.context_messages ? (typeof session.context_messages === 'string' ? JSON.parse(session.context_messages) : session.context_messages) : [];
    const summary = session?.summary || '';

    // 3. Build continuation messages
    const messages = buildContinuationMessages(storyConfig, history, summary, choice);

    // 4. Call DeepSeek
    const generatedText = await chatCompletion(messages, { temperature: 0.85, max_tokens: 4096 });

    // 5. Parse JSON
    let parsed;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      parsed = null;
    }

    const nodeContent = parsed?.content || generatedText;
    const nodeTitle = parsed?.title || '续章';
    const choices = parsed?.choices || [];

    // 6. Create new node
    const newNodeId = uuidv4();
    await conn.execute(
      `INSERT INTO story_nodes (id, story_id, title, content, type)
       VALUES (?, ?, ?, ?, 'regular')`,
      [newNodeId, storyId, nodeTitle, nodeContent]
    );

    // 7. Create branch from current node to new node
    const branchId = uuidv4();
    await conn.execute(
      `INSERT INTO branches (id, source_node_id, target_node_id, context)
       VALUES (?, ?, ?, ?)`,
      [branchId, nodeId, newNodeId, choice.substring(0, 500)]
    );

    // 8. Create choice child nodes
    const branchLinks = [];
    for (const ch of choices) {
      const chNodeId = uuidv4();
      await conn.execute(
        `INSERT INTO story_nodes (id, story_id, title, content, type)
         VALUES (?, ?, ?, '', 'branch')`,
        [chNodeId, storyId, ch.text]
      );
      const chBranchId = uuidv4();
      await conn.execute(
        `INSERT INTO branches (id, source_node_id, target_node_id, context)
         VALUES (?, ?, ?, ?)`,
        [chBranchId, newNodeId, chNodeId, ch.text]
      );
      branchLinks.push({ id: chBranchId, nodeId: chNodeId, text: ch.text, hint: ch.hint });
    }

    // 9. Update session
    const newHistory = [
      ...messages,
      { role: 'assistant', content: nodeContent }
    ];
    const totalNodes = (session?.total_nodes || 0) + 1 + choices.length;

    await conn.execute(
      `UPDATE ai_story_sessions SET context_messages = ?, current_node_id = ?, total_nodes = ?, updated_at = NOW()
       WHERE story_id = ? AND user_id = ?`,
      [JSON.stringify(newHistory.slice(-20)), newNodeId, totalNodes, storyId, req.user.id]
    );

    await conn.commit();

    res.status(200).json({
      success: true,
      message: 'AI 续写成功',
      data: {
        nodeId: newNodeId,
        title: nodeTitle,
        content: nodeContent,
        choices: branchLinks,
        totalNodes
      }
    });
  } catch (error) {
    await conn.rollback();
    console.error('AI 续写失败:', error);
    next(errorFormat(500, 'AI 续写失败: ' + error.message, [], 10013));
  } finally {
    conn.release();
  }
});

/**
 * GET /story/:storyId/session — Get reading session (PRESERVED from original logic)
 */
router.get('/story/:storyId/session', authGuard, [
  param('storyId').isInt().withMessage('故事 ID 格式不正确')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }
  try {
    const { storyId } = req.params;
    const conn = await pool.getConnection();
    try {
      const [sessions] = await conn.execute(
        'SELECT * FROM ai_story_sessions WHERE story_id = ? AND user_id = ?',
        [storyId, req.user.id]
      );

      if (sessions.length === 0) {
        return next(errorFormat(404, '阅读会话不存在'));
      }

      const session = sessions[0];
      let currentNode = null;
      if (session.current_node_id) {
        const [nodes] = await conn.execute('SELECT * FROM story_nodes WHERE id = ?', [session.current_node_id]);
        if (nodes.length > 0) currentNode = nodes[0];
      }

      res.json({
        success: true,
        data: {
          session: { totalNodes: session.total_nodes, summary: session.summary },
          currentNode,
          storyId: parseInt(storyId)
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    next(errorFormat(500, '获取会话失败: ' + error.message, [], 10013));
  }
});

/**
 * GET /sessions — My sessions list (NEW)
 */
router.get('/sessions', authGuard, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();
    try {
      const [countRows] = await conn.query(
        'SELECT COUNT(*) AS total FROM ai_story_sessions WHERE user_id = ?',
        [req.user.id]
      );
      const total = countRows[0].total;

      const [rows] = await conn.query(
        `SELECT s.id, s.story_id, s.current_node_id, s.total_nodes, s.summary,
                s.created_at, s.updated_at, st.title AS story_title
         FROM ai_story_sessions s
         JOIN stories st ON s.story_id = st.id
         WHERE s.user_id = ?
         ORDER BY s.updated_at DESC
         LIMIT ` + limit + ` OFFSET ` + offset,
        [req.user.id]
      );

      res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('获取会话列表失败:', error);
    next(errorFormat(500, '获取会话列表失败: ' + error.message, [], 10013));
  }
});

/**
 * DELETE /sessions/:id — Delete a session (NEW)
 */
router.delete('/sessions/:id', authGuard, [
  param('id').isInt().withMessage('会话 ID 格式不正确')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.execute(
      'SELECT * FROM ai_story_sessions WHERE id = ?',
      [req.params.id]
    );

    if (sessions.length === 0) {
      await conn.rollback();
      conn.release();
      return next(errorFormat(404, '会话不存在', [], 10002));
    }

    const session = sessions[0];
    if (session.user_id !== req.user.id) {
      await conn.rollback();
      conn.release();
      return next(errorFormat(403, '无权删除此会话', [], 10003));
    }

    await conn.execute('DELETE FROM ai_story_sessions WHERE id = ?', [req.params.id]);

    await conn.commit();

    res.json({
      success: true,
      message: '会话已删除'
    });
  } catch (error) {
    await conn.rollback();
    console.error('删除会话失败:', error);
    next(errorFormat(500, '删除会话失败: ' + error.message, [], 10013));
  } finally {
    conn.release();
  }
});

module.exports = router;
