const { pool } = require('../config/database');

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
   * @param {Object} favoriteData - 收藏数据
   * @returns {Promise<UserStoryFavorite>} 创建的收藏实例
   */
  static async create(favoriteData) {
    const connection = await pool.getConnection();
    try {
      const { userId, user_id, storyId, story_id } = favoriteData;
      const userIdValue = userId || user_id;
      const storyIdValue = storyId || story_id;

      // 验证必填字段
      if (!userIdValue || !storyIdValue) {
        throw new Error('用户ID和故事ID必填');
      }

      // 检查是否已收藏
      const [existing] = await connection.execute(
        'SELECT id FROM user_story_favorites WHERE user_id = ? AND story_id = ?',
        [userIdValue, storyIdValue]
      );
      if (existing.length > 0) {
        throw new Error('已收藏该故事');
      }

      const [result] = await connection.execute(
        `INSERT INTO user_story_favorites (user_id, story_id) 
         VALUES (?, ?)`,
        [userIdValue, storyIdValue]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找收藏
   * @param {Number} id - 收藏ID
   * @returns {Promise<UserStoryFavorite|null>} 收藏实例或null
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
   * @param {Object} query - 查询条件
   * @returns {Promise<UserStoryFavorite|null>} 收藏实例或null
   */
  static async findOne(query) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM user_story_favorites WHERE 1=1';
      const params = [];

      if (query.userId || query.user_id) {
        sql += ' AND user_id = ?';
        params.push(query.userId || query.user_id);
      }

      if (query.storyId || query.story_id) {
        sql += ' AND story_id = ?';
        params.push(query.storyId || query.story_id);
      }

      sql += ' LIMIT 1';

      const [favorites] = await connection.execute(sql, params);
      return favorites.length > 0 ? new UserStoryFavorite(favorites[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找所有收藏
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>} 收藏列表
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM user_story_favorites WHERE 1=1';
      const params = [];

      if (query.userId || query.user_id) {
        sql += ' AND user_id = ?';
        params.push(query.userId || query.user_id);
      }

      if (query.storyId || query.story_id) {
        sql += ' AND story_id = ?';
        params.push(query.storyId || query.story_id);
      }

      sql += ' ORDER BY created_at DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      if (query.skip) {
        sql += ' OFFSET ?';
        params.push(query.skip);
      }

      const [favorites] = await connection.execute(sql, params);
      return favorites.map(f => new UserStoryFavorite(f));
    } finally {
      connection.release();
    }
  }

  /**
   * 删除收藏
   * @param {Number} id - 收藏ID
   * @returns {Promise<Boolean>} 是否删除成功
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
   * @param {Number} userId - 用户ID
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Boolean>} 是否删除成功
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
   * @param {Number} userId - 用户ID
   * @returns {Promise<Number>} 收藏数量
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
