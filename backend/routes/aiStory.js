const express = require('express');
const { body, param, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { errorFormat } = require('../utils/errorFormat');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { chatCompletion } = require('../utils/deepseekClient');
const { buildSystemPrompt, buildContinuationMessages } = require('../utils/aiPromptBuilder');

const router = express.Router();

/**
 * POST /ai/story — 创建 AI 故事并生成第一章
 */
router.post('/story', authGuard, [
  body('title').trim().notEmpty().withMessage('故事标题不能为空').isLength({ max: 100 }),
  body('category_id').optional().isInt(),
  body('worldSetting').trim().notEmpty().withMessage('世界观设定不能为空'),
  body('characters').isArray({ min: 1 }).withMessage('至少需要一个角色'),
  body('outline').optional().trim(),
  body('style').optional(),
  body('startPrompt').trim().notEmpty().withMessage('开端提示不能为空')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '参数错误', errors.array().map(e => ({ field: e.path, message: e.msg })), 10001));
  }

  const conn = await pool.getConnection();
  try {
    const { title, category_id, worldSetting, characters, outline, style, startPrompt } = req.body;

    // 构建 AI 配置
    const aiConfig = { worldSetting, characters, outline, style };
    const storyConfig = { title, category: null, worldSetting, characters, outline, style: style || {} };

    // 1. 创建故事记录
    const [storyResult] = await conn.execute(
      `INSERT INTO stories (title, author_id, category_id, description, status, is_public, creation_mode, ai_config)
       VALUES (?, ?, ?, ?, 'draft', FALSE, 'ai', ?)`,
      [title, req.user.id, category_id || null, startPrompt.substring(0, 500), JSON.stringify(aiConfig)]
    );
    const storyId = storyResult.insertId;

    // 2. 保存角色卡
    if (characters && characters.length > 0) {
      for (const char of characters) {
        await conn.execute(
          `INSERT INTO ai_story_characters (story_id, name, personality_tags, description, relationships, avatar_prompt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [storyId, char.name, JSON.stringify(char.personality_tags || []), char.description || '', JSON.stringify(char.relationships || {}), char.avatar_prompt || '']
        );
      }
    }

    // 3. 构建 System Prompt 并调用 DeepSeek 生成第一章
    const systemPrompt = buildSystemPrompt(storyConfig);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请作为本章的开端，根据以下提示生成第一章内容：\n${startPrompt}` }
    ];

    const generatedText = await chatCompletion(messages, { temperature: 0.85, max_tokens: 4096 });

    // 4. 解析 AI 返回的 JSON
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

    // 5. 创建根节点
    const rootNodeId = uuidv4();
    await conn.execute(
      `INSERT INTO story_nodes (id, story_id, title, content, is_root, type)
       VALUES (?, ?, ?, ?, TRUE, 'regular')`,
      [rootNodeId, storyId, nodeTitle, nodeContent]
    );

    // 6. 为每个选项创建子节点和分支
    const branches = [];
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
      branches.push({ id: branchId, nodeId, text: choice.text, hint: choice.hint });
    }

    // 7. 创建阅读会话
    await conn.execute(
      `INSERT INTO ai_story_sessions (story_id, user_id, context_messages, current_node_id, total_nodes)
       VALUES (?, ?, ?, ?, ?)`,
      [storyId, req.user.id, JSON.stringify(messages), rootNodeId, 1 + choices.length]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'AI 故事创建成功',
      data: {
        storyId,
        rootNodeId,
        title: nodeTitle,
        content: nodeContent,
        choices: branches,
        totalNodes: 1 + choices.length
      }
    });
  } catch (error) {
    await conn.rollback();
    console.error('AI 故事创建失败:', error);
    next(errorFormat(500, 'AI 故事创建失败: ' + error.message, [], 10013));
  } finally {
    conn.release();
  }
});

/**
 * POST /ai/story/:storyId/generate — 根据读者选择续写
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
    const { storyId } = req.params;
    const { nodeId, choice } = req.body;

    // 1. 获取故事配置
    const [stories] = await conn.execute('SELECT * FROM stories WHERE id = ?', [storyId]);
    if (stories.length === 0) {
      return next(errorFormat(404, '故事不存在', [], 10002));
    }
    const story = stories[0];
    const aiConfig = story.ai_config ? (typeof story.ai_config === 'string' ? JSON.parse(story.ai_config) : story.ai_config) : {};
    const storyConfig = { title: story.title, category: null, ...aiConfig };

    // 2. 获取会话
    const [sessions] = await conn.execute(
      'SELECT * FROM ai_story_sessions WHERE story_id = ? AND user_id = ?',
      [storyId, req.user.id]
    );
    const session = sessions.length > 0 ? sessions[0] : null;
    const history = session?.context_messages ? (typeof session.context_messages === 'string' ? JSON.parse(session.context_messages) : session.context_messages) : [];
    const summary = session?.summary || '';

    // 3. 构建续写 messages
    const messages = buildContinuationMessages(storyConfig, history, summary, choice);

    // 4. 调用 DeepSeek 生成
    const generatedText = await chatCompletion(messages, { temperature: 0.85, max_tokens: 4096 });

    // 5. 解析 JSON
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

    // 6. 创建新节点
    const newNodeId = uuidv4();
    await conn.execute(
      `INSERT INTO story_nodes (id, story_id, title, content, type)
       VALUES (?, ?, ?, ?, 'regular')`,
      [newNodeId, storyId, nodeTitle, nodeContent]
    );

    // 7. 创建从当前节点到新节点的分支
    const branchId = uuidv4();
    await conn.execute(
      `INSERT INTO branches (id, source_node_id, target_node_id, context)
       VALUES (?, ?, ?, ?)`,
      [branchId, nodeId, newNodeId, choice.substring(0, 500)]
    );

    // 8. 创建选项子节点
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

    // 9. 更新会话
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
 * GET /ai/story/:storyId/session — 获取阅读会话
 */
router.get('/story/:storyId/session', authGuard, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const conn = await pool.getConnection();
    try {
      const [sessions] = await conn.execute(
        'SELECT * FROM ai_story_sessions WHERE story_id = ? AND user_id = ?',
        [storyId, req.user.id]
      );

      if (sessions.length === 0) {
        return Next(errorFormat(404, '阅读会话不存在'));
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

module.exports = router;
