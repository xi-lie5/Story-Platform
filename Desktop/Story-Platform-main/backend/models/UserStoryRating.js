const { pool } = require('../config/database');

class UserStoryRating {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.user_id = this.userId;
    this.storyId = data.story_id || data.storyId;
    this.story_id = this.storyId;
    this.rating = data.rating;
    this.comment = data.comment;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建评分
   * @param {Object} ratingData - 评分数据
   * @returns {Promise<UserStoryRating>} 创建的评分实例
   */
  static async create(ratingData) {
    const connection = await pool.getConnection();
    try {
      const { userId, user_id, storyId, story_id, rating, comment } = ratingData;
      const userIdValue = userId || user_id;
      const storyIdValue = storyId || story_id;

      // 验证必填字段
      if (!userIdValue || !storyIdValue || !rating) {
        throw new Error('用户ID、故事ID和评分必填');
      }

      // 验证评分范围
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error('评分必须是1-5之间的整数');
      }

      // 验证评论长度
      if (comment && comment.length > 500) {
        throw new Error('评论不能超过500个字符');
      }

      // 检查是否已评分
      const [existing] = await connection.execute(
        'SELECT id FROM user_story_ratings WHERE user_id = ? AND story_id = ?',
        [userIdValue, storyIdValue]
      );

      if (existing.length > 0) {
        // 更新现有评分
        await connection.execute(
          `UPDATE user_story_ratings SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = ? AND story_id = ?`,
          [rating, comment || null, userIdValue, storyIdValue]
        );
        return await this.findOne({ userId: userIdValue, storyId: storyIdValue });
      }

      const [result] = await connection.execute(
        `INSERT INTO user_story_ratings (user_id, story_id, rating, comment) 
         VALUES (?, ?, ?, ?)`,
        [userIdValue, storyIdValue, rating, comment || null]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找评分
   * @param {Number} id - 评分ID
   * @returns {Promise<UserStoryRating|null>} 评分实例或null
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [ratings] = await connection.execute(
        'SELECT * FROM user_story_ratings WHERE id = ?',
        [id]
      );
      return ratings.length > 0 ? new UserStoryRating(ratings[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找评分（支持多种查询条件）
   * @param {Object} query - 查询条件
   * @returns {Promise<UserStoryRating|null>} 评分实例或null
   */
  static async findOne(query) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM user_story_ratings WHERE 1=1';
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

      const [ratings] = await connection.execute(sql, params);
      return ratings.length > 0 ? new UserStoryRating(ratings[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找并更新评分
   * @param {Object} query - 查询条件
   * @param {Object} updateData - 更新数据
   * @returns {Promise<UserStoryRating|null>} 更新后的评分实例
   */
  static async findOneAndUpdate(query, updateData) {
    const connection = await pool.getConnection();
    try {
      const rating = await this.findOne(query);
      if (!rating) {
        return null;
      }

      const fields = [];
      const values = [];

      if (updateData.rating !== undefined) {
        if (!Number.isInteger(updateData.rating) || updateData.rating < 1 || updateData.rating > 5) {
          throw new Error('评分必须是1-5之间的整数');
        }
        fields.push('rating = ?');
        values.push(updateData.rating);
      }

      if (updateData.comment !== undefined) {
        if (updateData.comment && updateData.comment.length > 500) {
          throw new Error('评论不能超过500个字符');
        }
        fields.push('comment = ?');
        values.push(updateData.comment || null);
      }

      if (fields.length === 0) {
        return rating;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(rating.userId, rating.storyId);

      await connection.execute(
        `UPDATE user_story_ratings SET ${fields.join(', ')} 
         WHERE user_id = ? AND story_id = ?`,
        values
      );

      return await this.findOne(query);
    } finally {
      connection.release();
    }
  }

  /**
   * 查找所有评分
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>} 评分列表
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM user_story_ratings WHERE 1=1';
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

      const [ratings] = await connection.execute(sql, params);
      return ratings.map(r => new UserStoryRating(r));
    } finally {
      connection.release();
    }
  }

  /**
   * 删除评分
   * @param {Number} id - 评分ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM user_story_ratings WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户和故事删除评分
   * @param {Number} userId - 用户ID
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async deleteByUserAndStory(userId, storyId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM user_story_ratings WHERE user_id = ? AND story_id = ?',
        [userId, storyId]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 计算故事的平均评分
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Object>} 评分统计
   */
  static async getStoryRatingStats(storyId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `SELECT 
          COUNT(*) as count,
          AVG(rating) as average,
          SUM(rating) as total
         FROM user_story_ratings 
         WHERE story_id = ?`,
        [storyId]
      );
      return {
        count: result[0].count || 0,
        average: result[0].average ? parseFloat(result[0].average).toFixed(2) : 0,
        total: result[0].total || 0
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = UserStoryRating;
