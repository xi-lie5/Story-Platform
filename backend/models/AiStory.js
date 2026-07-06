const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AiStory {
  /**
   * 创建规则书
   */
  static async create(data) {
    const conn = await pool.getConnection();
    try {
      const id = uuidv4();
      const {
        title, author_id, world_setting, start_prompt,
        outline, style, mood_tags, characters_config,
        category_id, description
      } = data;

      if (!title || !author_id || !world_setting || !start_prompt) {
        throw new Error('标题、作者、世界观设定和开端提示为必填项');
      }

      await conn.execute(
        `INSERT INTO ai_stories (id, title, author_id, world_setting, start_prompt,
          outline, style, mood_tags, characters_config, category_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, title.trim(), author_id, world_setting.trim(), start_prompt.trim(),
          outline || null,
          style ? JSON.stringify(style) : null,
          mood_tags ? JSON.stringify(mood_tags) : null,
          characters_config ? JSON.stringify(characters_config) : null,
          category_id || null,
          description || start_prompt.substring(0, 500)
        ]
      );

      return await this.findById(id);
    } finally {
      conn.release();
    }
  }

  /**
   * 根据 ID 查找规则书
   */
  static async findById(id) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM ai_stories WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return this._formatRow(rows[0]);
    } finally {
      conn.release();
    }
  }

  /**
   * 获取公开的规则书列表（广场）
   */
  static async findPublic(options = {}) {
    const conn = await pool.getConnection();
    try {
      const page = Math.max(parseInt(options.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(options.limit) || 12, 1), 50);
      const offset = (page - 1) * limit;

      let sql = 'SELECT a.*, u.username AS author_name, u.avatar AS author_avatar FROM ai_stories a LEFT JOIN users u ON a.author_id = u.id WHERE a.status = ? AND a.is_public = ?';
      const params = ['published', true];

      if (options.category_id) {
        sql += ' AND a.category_id = ?';
        params.push(options.category_id);
      }

      if (options.search) {
        sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
        const pattern = '%' + options.search.trim() + '%';
        params.push(pattern, pattern);
      }

      // Count — use query() to avoid MySQL prepared-statement LIMIT/OFFSET bug
      const countSql = sql.replace('SELECT a.*, u.username AS author_name, u.avatar AS author_avatar', 'SELECT COUNT(*) AS total');
      const [countRows] = await conn.query(countSql, params);
      const total = countRows[0].total;

      // Fetch — embed LIMIT/OFFSET as integers to avoid prepared-statement protocol bug
      sql += ' ORDER BY a.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
      const [rows] = await conn.query(sql, params);

      return {
        stories: rows.map(r => this._formatRow(r)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } finally {
      conn.release();
    }
  }

  /**
   * 获取用户创建的规则书
   */
  static async findByAuthor(authorId, options = {}) {
    const conn = await pool.getConnection();
    try {
      const page = Math.max(parseInt(options.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(options.limit) || 10, 1), 50);
      const offset = (page - 1) * limit;
      const status = options.status || null;

      let sql = 'SELECT * FROM ai_stories WHERE author_id = ?';
      const params = [authorId];

      if (status && status !== 'all') {
        sql += ' AND status = ?';
        params.push(status);
      }

      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) AS total');
      const [countRows] = await conn.query(countSql, params);
      const total = countRows[0].total;

      sql += ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
      const [rows] = await conn.query(sql, params);

      return {
        stories: rows.map(r => this._formatRow(r)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } finally {
      conn.release();
    }
  }

  /**
   * 更新规则书
   */
  static async update(id, data) {
    const conn = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      const whitelist = ['title', 'world_setting', 'start_prompt', 'outline',
        'style', 'mood_tags', 'characters_config', 'category_id', 'description'];

      for (const key of whitelist) {
        if (data[key] !== undefined) {
          fields.push(key + ' = ?');
          const val = (key === 'style' || key === 'mood_tags' || key === 'characters_config')
            ? JSON.stringify(data[key])
            : data[key];
          values.push(val);
        }
      }

      if (fields.length === 0) return await this.findById(id);

      values.push(id);
      await conn.execute('UPDATE ai_stories SET ' + fields.join(', ') + ' WHERE id = ?', values);
      return await this.findById(id);
    } finally {
      conn.release();
    }
  }

  /**
   * 发布/下架规则书
   */
  static async setPublishStatus(id, { status, isPublic }) {
    const conn = await pool.getConnection();
    try {
      if (!['draft', 'published', 'unpublished'].includes(status)) {
        throw new Error('无效的状态值');
      }
      await conn.execute(
        'UPDATE ai_stories SET status = ?, is_public = ? WHERE id = ?',
        [status, isPublic ? 1 : 0, id]
      );
      return await this.findById(id);
    } finally {
      conn.release();
    }
  }

  /**
   * 删除规则书及其所有关联会话
   */
  static async delete(id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Delete sessions that reference stories created from this config
      await conn.execute(
        'DELETE FROM ai_story_sessions WHERE story_id IN (SELECT id FROM stories WHERE ai_config IS NOT NULL)'
      );
      await conn.execute('DELETE FROM ai_stories WHERE id = ?', [id]);
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /**
   * 增加浏览次数
   */
  static async incrementViews(id) {
    const conn = await pool.getConnection();
    try {
      await conn.execute('UPDATE ai_stories SET view_count = view_count + 1 WHERE id = ?', [id]);
    } finally {
      conn.release();
    }
  }

  /**
   * 更新总游玩次数
   */
  static async incrementSessions(id) {
    const conn = await pool.getConnection();
    try {
      await conn.execute('UPDATE ai_stories SET total_sessions = total_sessions + 1 WHERE id = ?', [id]);
    } finally {
      conn.release();
    }
  }

  static _formatRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      author_id: row.author_id,
      author_name: row.author_name || null,
      author_avatar: row.author_avatar || null,
      world_setting: row.world_setting,
      start_prompt: row.start_prompt,
      outline: row.outline,
      style: (typeof row.style === 'string' ? JSON.parse(row.style) : row.style) || {},
      mood_tags: (typeof row.mood_tags === 'string' ? JSON.parse(row.mood_tags) : row.mood_tags) || [],
      characters_config: (typeof row.characters_config === 'string' ? JSON.parse(row.characters_config) : row.characters_config) || [],
      category_id: row.category_id,
      cover_image: row.cover_image,
      description: row.description,
      status: row.status,
      is_public: !!row.is_public,
      total_sessions: row.total_sessions || 0,
      view_count: row.view_count || 0,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

module.exports = AiStory;
