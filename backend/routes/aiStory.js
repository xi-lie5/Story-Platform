const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { chatCompletion } = require('../utils/deepseekClient');
const { buildSystemPrompt, buildContinuationMessages, buildEndingMessages, parseAiResponse } = require('../utils/aiPromptBuilder');
const AiStory = require('../models/AiStory');

const router = express.Router();

// 安全释放数据库连接
function safeRelease(conn) {
  if (conn) {
    try { conn.release(); } catch (e) { /* 忽略 */ }
  }
}

// 安全回滚事务
async function safeRollback(conn) {
  if (conn) {
    try { await conn.rollback(); } catch (e) { /* 忽略 */ }
  }
}

/**
 * 调用 DeepSeek 生成内容，并在解析结果不合格（choices 为空或正文过短，
 * 通常是输出被 max_tokens 截断导致）时自动重试，最多重试 MAX_RETRIES 次。
 * 重试时会在消息末尾追加更强的格式提醒，要求 AI 缩短正文以避免再次截断。
 * 若重试后依然失败，抛出明确的错误，交由路由层返回给前端（前端已有"重试"按钮）。
 *
 * 绝不在此处填充假选项兜底——保证选项要么是 AI 真实生成的，要么明确报错。
 *
 * @param {Array} baseMessages - 基础 messages 数组
 * @returns {Promise<{title: string, content: string, choices: Array}>}
 */
async function generateStoryContentWithRetry(baseMessages, options = {}) {
  const ending = options.ending === true; // 结局模式：允许（并要求）choices 为空
  const MAX_RETRIES = 2; // 首次请求 + 最多 2 次重试
  let lastParsed = null;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let messages = baseMessages;
    if (attempt > 0) {
      messages = [
        ...baseMessages,
        {
          role: 'user',
          content: ending
            ? [
                `【系统提醒·第${attempt}次重试】上次未能生成有效的结局正文。`,
                '请重新生成本故事的大结局，注意：',
                '1. choices 必须是空数组 []；',
                '2. content 为完整收束的结局正文，控制在 600-900 字以内，确保 JSON 完整闭合；',
                '3. 只返回合法 JSON，字段顺序 title、choices、content。'
              ].join('')
            : [
                `【系统提醒·第${attempt}次重试】你上一次的输出未能提取到有效的 choices 选项或正文过短，`,
                '很可能是因为 content 正文过长导致输出被截断，choices 字段没能完整生成。',
                '请重新生成本段内容，并严格注意：',
                '1. 字段顺序必须是 title → choices → content；',
                '2. choices 数组必须包含 2-3 个非空选项，且必须在 content 之前完整输出；',
                '3. 本次 content 正文请控制在 600-900 字以内，宁可写短一些，也要确保 JSON 完整闭合、choices 不丢失；',
                '4. 只返回合法 JSON，不要有多余文字。'
              ].join('')
        }
      ];
    }

    let generatedText;
    try {
      generatedText = await chatCompletion(messages, { temperature: attempt > 0 ? 0.7 : 0.85, max_tokens: 8192 });
    } catch (err) {
      lastError = err;
      continue; // 网络/API 错误，直接进入下一次重试
    }

    const parsed = parseAiResponse(generatedText);
    // 结局模式下 choices 允许为空；普通模式必须有非空 choices
    const hasValidChoices = ending ? true : (Array.isArray(parsed.choices) && parsed.choices.length > 0);
    const hasValidContent = typeof parsed.content === 'string' && parsed.content.trim().length >= 30;

    if (hasValidChoices && hasValidContent) {
      // 结局模式强制清空 choices，确保生成的是无后续的结束节点
      if (ending) parsed.choices = [];
      return parsed; // 真正成功：选项和正文都真实存在（结局模式只看正文）
    }

    lastParsed = parsed;
    console.warn(
      `[AI生成] 第${attempt + 1}次尝试结果不合格（ending=${ending}, choices=${parsed.choices.length}, contentLen=${(parsed.content || '').length}, truncated=${parsed.truncated}），准备重试`
    );
  }

  // 所有重试均失败，绝不塞假数据，明确抛出错误
  if (lastParsed) {
    const reason = !lastParsed.content || lastParsed.content.trim().length < 30
      ? 'AI 生成的正文内容为空或过短'
      : 'AI 未能生成有效的分支选项';
    const err = new Error(`${reason}，已重试 ${MAX_RETRIES} 次仍未成功，请稍后重试`);
    err.aiGenerationFailed = true;
    throw err;
  }
  throw lastError || new Error('AI 生成失败，请稍后重试');
}

// =============================================
// Section 1: Rulebook Config Endpoints
// =============================================

/**
 * POST /config — 创建规则书（工坊保存配置，不生成章节）
 */
router.post('/config', authGuard, [
  body('title').trim().notEmpty().withMessage('标题不能为空').isLength({ max: 100 }),
  body('worldSetting').trim().notEmpty().withMessage('World setting is required'),
  body('startPrompt').trim().notEmpty().withMessage('Start prompt is required'),
  body('characters').isArray({ min: 1 }).withMessage('At least one character is required'),
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
      message: 'Config created successfully',
      data: { id: config.id, title: config.title }
    });
  } catch (error) {
    console.error('规则书创建失败:', error);
    next(errorFormat(500, 'Config create failed: ' + error.message, [], 10013));
  }
});

/**
 * PUT /config/:id — 编辑规则书（部分更新）
 */
router.put('/config/:id', authGuard, [
  param('id').isUUID().withMessage('Invalid ID format'),
  body('title').optional().trim().isLength({ max: 100 }),
  body('worldSetting').trim().notEmpty().withMessage('World setting is required'),
  body('startPrompt').trim().notEmpty().withMessage('Start prompt is required'),
  body('outline').optional().trim(),
  body('style').optional(),
  body('moodTags').optional().isArray(),
  body('characters').isArray({ min: 1 }).withMessage('At least one character is required'),
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
      message: 'Config updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('规则书更新失败:', error);
    next(errorFormat(500, 'Config update failed: ' + error.message, [], 10013));
  }
});

/**
 * GET /configs — 公开广场列表（无需认证）
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
 * GET /configs/my — 我的规则书（需要认证）
 * 必须在 /configs/:id 之前定义，避免 "my" 被匹配为 :id
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
 * GET /configs/:id — 单个规则书详情（公开，无需认证）
 */
router.get('/configs/:id', [
  param('id').isUUID().withMessage('Invalid ID format'),
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

    // 异步增加浏览次数
    AiStory.incrementViews(req.params.id).catch(() => {});

    // 附加评分聚合（平均分 + 评分人数）
    try {
      const [ratingRows] = await pool.query(
        'SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM ai_config_ratings WHERE config_id = ?',
        [req.params.id]
      );
      config.avgRating = ratingRows[0] && ratingRows[0].avg_rating ? Number(Number(ratingRows[0].avg_rating).toFixed(2)) : 0;
      config.ratingCount = ratingRows[0] ? Number(ratingRows[0].rating_count) : 0;
    } catch (e) {
      config.avgRating = 0;
      config.ratingCount = 0;
    }

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
 * POST /configs/:id/rate — 给规则书评分（1-5，登录用户，重复评分则更新）
 */
router.post('/configs/:id/rate', authGuard, [
  param('id').isUUID().withMessage('Invalid ID format'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer from 1 to 5')
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

    const rating = parseInt(req.body.rating, 10);
    await pool.query(
      `INSERT INTO ai_config_ratings (config_id, user_id, rating) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
      [req.params.id, req.user.id, rating]
    );

    const [ratingRows] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM ai_config_ratings WHERE config_id = ?',
      [req.params.id]
    );
    const avgRating = ratingRows[0] && ratingRows[0].avg_rating ? Number(Number(ratingRows[0].avg_rating).toFixed(2)) : 0;
    const ratingCount = ratingRows[0] ? Number(ratingRows[0].rating_count) : 0;

    res.json({
      success: true,
      message: '评分成功',
      data: { userRating: rating, avgRating, ratingCount }
    });
  } catch (error) {
    console.error('规则书评分失败:', error);
    next(errorFormat(500, '评分失败: ' + error.message, [], 10013));
  }
});

/**
 * GET /configs/:id/rating — 获取当前用户对规则书的评分及聚合
 */
router.get('/configs/:id/rating', authGuard, [
  param('id').isUUID().withMessage('Invalid ID format')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  try {
    const [aggRows] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM ai_config_ratings WHERE config_id = ?',
      [req.params.id]
    );
    const [userRows] = await pool.query(
      'SELECT rating FROM ai_config_ratings WHERE config_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      data: {
        avgRating: aggRows[0] && aggRows[0].avg_rating ? Number(Number(aggRows[0].avg_rating).toFixed(2)) : 0,
        ratingCount: aggRows[0] ? Number(aggRows[0].rating_count) : 0,
        userRating: userRows[0] ? userRows[0].rating : null
      }
    });
  } catch (error) {
    next(errorFormat(500, '获取评分失败: ' + error.message, [], 10013));
  }
});

/**
 * PATCH /configs/:id/publish — 发布或下架规则书
 */
router.patch('/configs/:id/publish', authGuard, [
  param('id').isUUID().withMessage('Invalid ID format'),
  body('action').isIn(['publish', 'unpublish']).withMessage('Action must be publish or unpublish')
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
 * DELETE /configs/:id — 删除规则书（级联删除会话）
 */
router.delete('/configs/:id', authGuard, [
  param('id').isUUID().withMessage('Invalid ID format'),
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
 * POST /configs/:id/start — 开始新的冒险会话
 * 加载规则书，调用 DeepSeek 生成第一章，创建 story/session 记录
 *
 * 修复：将 DeepSeek 调用移出数据库事务，避免长时间占用连接
 */
router.post('/configs/:id/start', authGuard, [
  param('id').isUUID().withMessage('Invalid ID format'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  // 第一步：读取规则书配置（非事务，读完后立即释放连接）
  let config;
  try {
    config = await AiStory.findById(req.params.id);
    if (!config) {
      return next(errorFormat(404, '规则书不存在', [], 10002));
    }
  } catch (error) {
    console.error('加载规则书失败:', error);
    return next(errorFormat(500, '加载规则书失败: ' + error.message, [], 10013));
  }

  // 第二步：构建 prompt 并调用 DeepSeek（不占用数据库连接），失败/异常自动重试
  let parsedResult;
  try {
    const storyConfig = {
      title: config.title,
      worldSetting: config.world_setting,
      characters: config.characters_config,
      outline: config.outline,
      style: config.style
    };

    const systemPrompt = buildSystemPrompt(storyConfig);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请作为本章的开端，根据以下提示生成第一章内容：\n' + config.start_prompt }
    ];

    parsedResult = await generateStoryContentWithRetry(messages);
  } catch (error) {
    console.error('DeepSeek 生成第一章失败:', error);
    return next(errorFormat(500, 'AI 生成失败: ' + error.message, [], 10013));
  }

  const nodeContent = parsedResult.content;
  const nodeTitle = parsedResult.title && parsedResult.title !== '续章' ? parsedResult.title : '第一章';
  const choices = parsedResult.choices;

  // 第四步：写入数据库（事务，快速完成）
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const storyConfig = {
      title: config.title,
      worldSetting: config.world_setting,
      characters: config.characters_config,
      outline: config.outline,
      style: config.style
    };

    // 创建 story 记录
    const [storyResult] = await conn.execute(
      `INSERT INTO stories (title, author_id, category_id, description, status, is_public, creation_mode, ai_config)
       VALUES (?, ?, ?, ?, 'draft', FALSE, 'ai', ?)`,
      [config.title, req.user.id, config.category_id || null,
       (config.start_prompt || '').substring(0, 500), JSON.stringify(storyConfig)]
    );
    const storyId = storyResult.insertId;

    // 保存角色卡
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

    // 创建根节点（唯一的内容节点，不再创建空的选项占位节点）
    // 若 AI 未给出任何后续选项，说明本段即为结局，标记 type='end'，
    // 以便阅读分析的"完成率"能正确统计到达结局的读者。
    const rootNodeType = (Array.isArray(choices) && choices.length > 0) ? 'regular' : 'end';
    const rootNodeId = uuidv4();
    await conn.execute(
      `INSERT INTO story_nodes (id, story_id, title, content, is_root, type)
       VALUES (?, ?, ?, ?, TRUE, ?)`,
      [rootNodeId, storyId, nodeTitle, nodeContent, rootNodeType]
    );

    // 选项以 {text, hint} 数组形式保存，供前端渲染
    const choiceList = choices.map((c) => ({ text: c.text, hint: c.hint || '' }));

    // 创建会话，把当前待选项存入 current_choices
    // assistant 历史存为 JSON 字符串，保持"助手总是返回 JSON"的格式一致性，
    // 避免后续续写时 AI 模仿纯文本示例而丢失 JSON 结构
    const assistantJson = JSON.stringify({ title: nodeTitle, content: nodeContent, choices: choiceList });
    const sessionMessages = [
      { role: 'system', content: buildSystemPrompt(storyConfig) },
      { role: 'user', content: config.start_prompt },
      { role: 'assistant', content: assistantJson }
    ];
    await conn.execute(
      `INSERT INTO ai_story_sessions (story_id, user_id, context_messages, current_node_id, total_nodes, current_choices)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [storyId, req.user.id, JSON.stringify(sessionMessages), rootNodeId, 1, JSON.stringify(choiceList)]
    );

    // 增加规则书游玩次数
    await AiStory.incrementSessions(req.params.id);

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Adventure started',
      data: {
        storyId,
        configId: req.params.id,
        rootNodeId,
        title: nodeTitle,
        content: nodeContent,
        choices: choiceList,
        totalNodes: 1
      }
    });
  } catch (error) {
    await safeRollback(conn);
    console.error('开始冒险数据库写入失败:', error);
    next(errorFormat(500, 'Adventure start failed: ' + error.message, [], 10013));
  } finally {
    safeRelease(conn);
  }
});

/**
 * POST /story/:storyId/generate — 续写故事
 *
 * 修复：将 DeepSeek 调用移出数据库事务，避免长时间占用连接
 * 修复：catch 块中 rollback 安全处理，确保 next() 一定被调用
 */
router.post('/story/:storyId/generate', authGuard, [
  param('storyId').isInt(),
  body('nodeId').trim().notEmpty().withMessage('当前节点ID不能为空'),
  body('endStory').optional().isBoolean(),
  // 结束故事时允许不带 choice；普通续写必须有 choice
  body('choice').custom((value, { req }) => {
    if (req.body.endStory === true || req.body.endStory === 'true') return true;
    if (!value || !String(value).trim()) throw new Error('选择文本不能为空');
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  const { storyId } = req.params;
  const { nodeId } = req.body;
  const endStory = req.body.endStory === true || req.body.endStory === 'true';
  // 结束故事时读者可能没有选择具体行动，用占位文案记录
  const choice = (req.body.choice && String(req.body.choice).trim()) ? String(req.body.choice).trim() : (endStory ? '（读者选择结束故事）' : '');

  // 第一步：读取故事配置和会话（非事务，读完后释放连接）
  let story, session;
  let readConn = null;
  try {
    readConn = await pool.getConnection();

    const [stories] = await readConn.execute('SELECT * FROM stories WHERE id = ?', [storyId]);
    if (stories.length === 0) {
      readConn.release();
      return next(errorFormat(404, 'Resource not found', [], 10002));
    }
    story = stories[0];

    const [sessions] = await readConn.execute(
      'SELECT * FROM ai_story_sessions WHERE story_id = ? AND user_id = ?',
      [storyId, req.user.id]
    );
    session = sessions.length > 0 ? sessions[0] : null;

    readConn.release();
    readConn = null;
  } catch (error) {
    safeRelease(readConn);
    console.error('读取故事/会话失败:', error);
    return next(errorFormat(500, '读取数据失败: ' + error.message, [], 10013));
  }

  // 第二步：构建续写消息并调用 DeepSeek（不占用数据库连接），失败/异常自动重试
  let parsedResult;
  try {
    const aiConfig = story.ai_config ? (typeof story.ai_config === 'string' ? JSON.parse(story.ai_config) : story.ai_config) : {};
    const storyConfig = { title: story.title, category: null, ...aiConfig };

    const history = session?.context_messages
      ? (typeof session.context_messages === 'string' ? JSON.parse(session.context_messages) : session.context_messages)
      : [];
    const summary = session?.summary || '';

    const messages = endStory
      ? buildEndingMessages(storyConfig, history, summary, choice)
      : buildContinuationMessages(storyConfig, history, summary, choice);

    parsedResult = await generateStoryContentWithRetry(messages, { ending: endStory });
  } catch (error) {
    console.error('DeepSeek 续写失败:', error);
    return next(errorFormat(500, 'AI 续写失败: ' + error.message, [], 10013));
  }

  const nodeContent = parsedResult.content;
  const nodeTitle = parsedResult.title;
  // 结束故事时强制无后续选项
  const choices = endStory ? [] : parsedResult.choices;

  // 第四步：写入数据库（事务，快速完成）
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 创建新的内容节点
    // 若 AI 未给出后续选项，说明剧情收尾，标记 type='end'，供阅读分析统计"完成"
    const newNodeType = (Array.isArray(choices) && choices.length > 0) ? 'regular' : 'end';
    const newNodeId = uuidv4();
    await conn.execute(
      `INSERT INTO story_nodes (id, story_id, title, content, type)
       VALUES (?, ?, ?, ?, ?)`,
      [newNodeId, storyId, nodeTitle, nodeContent, newNodeType]
    );

    // 创建从当前节点到新节点的真实分支（记录用户所选路径，context = 所选文本）
    // 不再为每个待选项创建空的占位节点
    const branchId = uuidv4();
    await conn.execute(
      `INSERT INTO branches (id, source_node_id, target_node_id, context)
       VALUES (?, ?, ?, ?)`,
      [branchId, nodeId, newNodeId, String(choice).substring(0, 500)]
    );

    // 新的待选项，保存到会话 current_choices，供前端渲染
    const choiceList = choices.map((c) => ({ text: c.text, hint: c.hint || '' }));

    // 更新会话
    const history = session?.context_messages
      ? (typeof session.context_messages === 'string' ? JSON.parse(session.context_messages) : session.context_messages)
      : [];

    // assistant 历史存为 JSON 字符串，保持格式一致性，避免 AI 后续丢失 JSON 结构
    const assistantJson = JSON.stringify({ title: nodeTitle, content: nodeContent, choices: choiceList });
    const newHistory = [
      ...history,
      { role: 'user', content: `读者选择了：${choice}` },
      { role: 'assistant', content: assistantJson }
    ];
    // total_nodes 现在表示已阅读的内容节点数
    const totalNodes = (session?.total_nodes || 1) + 1;

    await conn.execute(
      `UPDATE ai_story_sessions SET context_messages = ?, current_node_id = ?, total_nodes = ?, current_choices = ?, updated_at = NOW()
       WHERE story_id = ? AND user_id = ?`,
      [JSON.stringify(newHistory.slice(-20)), newNodeId, totalNodes, JSON.stringify(choiceList), storyId, req.user.id]
    );

    await conn.commit();

    res.status(200).json({
      success: true,
      message: endStory ? '故事已完结' : 'AI 续写成功',
      data: {
        nodeId: newNodeId,
        title: nodeTitle,
        content: nodeContent,
        choices: choiceList,
        totalNodes,
        ended: endStory
      }
    });
  } catch (error) {
    await safeRollback(conn);
    console.error('AI 续写数据库写入失败:', error);
    next(errorFormat(500, 'AI 续写失败: ' + error.message, [], 10013));
  } finally {
    safeRelease(conn);
  }
});

/**
 * GET /story/:storyId/session — 获取阅读会话
 */
router.get('/story/:storyId/session', authGuard, [
  param('storyId').isInt().withMessage('Invalid story ID'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }
  const conn = await pool.getConnection();
  try {
    const { storyId } = req.params;
    const [sessions] = await conn.execute(
      'SELECT * FROM ai_story_sessions WHERE story_id = ? AND user_id = ?',
      [storyId, req.user.id]
    );

    if (sessions.length === 0) {
      return next(errorFormat(404, 'Resource not found', [], 10002));
    }

    const session = sessions[0];
    let currentNode = null;
    if (session.current_node_id) {
      const [nodes] = await conn.execute('SELECT * FROM story_nodes WHERE id = ?', [session.current_node_id]);
      if (nodes.length > 0) currentNode = nodes[0];
    }

    // 解析当前节点的待选项
    let currentChoices = [];
    if (session.current_choices) {
      try {
        currentChoices = typeof session.current_choices === 'string'
          ? JSON.parse(session.current_choices)
          : session.current_choices;
      } catch (e) {
        currentChoices = [];
      }
    }

    res.json({
      success: true,
      data: {
        session: { totalNodes: session.total_nodes, summary: session.summary },
        currentNode,
        currentChoices: Array.isArray(currentChoices) ? currentChoices : [],
        storyId: parseInt(storyId)
      }
    });
  } catch (error) {
    next(errorFormat(500, '获取会话失败: ' + error.message, [], 10013));
  } finally {
    safeRelease(conn);
  }
});

/**
 * GET /sessions — 我的会话列表
 */
router.get('/sessions', authGuard, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  const conn = await pool.getConnection();
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;

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
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    next(errorFormat(500, '获取会话列表失败: ' + error.message, [], 10013));
  } finally {
    safeRelease(conn);
  }
});

/**
 * DELETE /sessions/:id — 删除会话
 */
router.delete('/sessions/:id', authGuard, [
  param('id').isInt().withMessage('Invalid session ID'),
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
      await safeRollback(conn);
      return next(errorFormat(404, 'Resource not found', [], 10002));
    }

    const session = sessions[0];
    if (session.user_id !== req.user.id) {
      await safeRollback(conn);
      return next(errorFormat(403, 'Forbidden', [], 10003));
    }

    await conn.execute('DELETE FROM ai_story_sessions WHERE id = ?', [req.params.id]);

    await conn.commit();

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    await safeRollback(conn);
    console.error('删除会话失败:', error);
    next(errorFormat(500, '删除会话失败: ' + error.message, [], 10013));
  } finally {
    safeRelease(conn);
  }
});

module.exports = router;
