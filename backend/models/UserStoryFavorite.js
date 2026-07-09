const { pool } = require('../config/database');

/**
 * 用户故事收藏模型
 * 操作 user_story_favorites 表
 *
 * 注意：项目中还存在旧的 Collection 模型（操作 collections 表），
 * 两者功能重叠。interactions 路由使用本模型（UserStoryFavorite），
 * users 路由中 Collection.countByUser 仅用于统计。
 * 建议后续统一使用本模型并删除 Collection。
 */
class UserStoryFavorite {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.user_id = this.userId;
    this.storyId = data.story_id || data.storyId;
    this.story_id = this.storyId;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建收藏
   */
  static async create(favoriteData) {
    const connection = await pool.getConnection();
    try {
      const { userId, user_id, storyId, story_id } = favoriteData;
      const userIdValue = userId || user_id;
      const storyIdValue = storyId || story_id;

      if (!userIdValue || !storyIdValue) {
        throw new Error('用户ID和故事ID必填');
      }

      const [existing] = await connection.execute(
        'SELECT id FROM user_story_favorites WHERE user_id = ? AND story_id = ?',
        [userIdValue, storyIdValue]
      );
      if (existing.length > 0) {
        throw new Error('已收藏该故事');
      }

      const [result] = await connection.execute(
        `INSERT INTO user_story_favorites (user_id, story_id) VALUES (?, ?)`,
        [userIdValue, storyIdValue]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找收藏
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [favorites] = await connection.execute(
        'SELECT * FROM user_story_favorites WHERE id = ?',
        [id]
      );
      return favorites.length > 0 ? new UserStoryFavorite(favorites[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找收藏（支持多种查询条件）
   */
  static async findOne(query) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM user_story_favorites WHERE 1=1';
      const params = [];
      if (query.userId || query.user_id) { sql += ' AND user_id = ?'; params.push(query.userId || query.user_id); }
      if (query.storyId || query.story_id) { sql += ' AND story_id = ?'; params.push(query.storyId || query.story_id); }
      sql += ' LIMIT 1';
      const [favorites] = await connection.execute(sql, params);
      return favorites.length > 0 ? new UserStoryFavorite(favorites[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找所有收藏
   * LIMIT/OFFSET 使用参数化查询（?）防止 SQL 注入
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM user_story_favorites WHERE 1=1';
      const params = [];
      if (query.userId || query.user_id) { sql += ' AND user_id = ?'; params.push(query.userId || query.user_id); }
      if (query.storyId || query.story_id) { sql += ' AND story_id = ?'; params.push(query.storyId || query.story_id); }
      sql += ' ORDER BY created_at DESC';
      if (query.limit) {
        const limit = Math.max(0, parseInt(query.limit, 10) || 0);
        sql += ' LIMIT ?';
        params.push(limit);
      }
      if (query.skip) {
        const skip = Math.max(0, parseInt(query.skip, 10) || 0);
        sql += ' OFFSET ?';
        params.push(skip);
      }
      const [favorites] = await connection.query(sql, params);
      return favorites.map(f => new UserStoryFavorite(f));
    } finally {
      connection.release();
    }
  }

  /**
   * 删除收藏
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM user_story_favorites WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户和故事删除收藏
   */
  static async deleteByUserAndStory(userId, storyId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM user_story_favorites WHERE user_id = ? AND story_id = ?',
        [userId, storyId]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 统计用户收藏数量
   */
  static async countByUser(userId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as count FROM user_story_favorites WHERE user_id = ?',
        [userId]
      );
      return result[0].count;
    } finally {
      connection.release();
    }
  }
}

module.exports = UserStoryFavorite;
