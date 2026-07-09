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
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  static validateRating(rating) {
    const value = Number(rating);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error('Rating must be an integer from 1 to 5');
    }
    return value;
  }

  static validateComment(comment) {
    if (comment === undefined || comment === null || comment === '') {
      return null;
    }
    const value = String(comment).trim();
    if (value.length > 500) {
      throw new Error('Comment cannot exceed 500 characters');
    }
    return value || null;
  }

  static async create(ratingData) {
    const connection = await pool.getConnection();
    try {
      const userId = ratingData.userId || ratingData.user_id;
      const storyId = ratingData.storyId || ratingData.story_id;
      const rating = this.validateRating(ratingData.rating);
      const comment = this.validateComment(ratingData.comment);

      if (!userId || !storyId) {
        throw new Error('User ID and story ID are required');
      }

      const [existing] = await connection.execute(
        'SELECT id FROM user_story_ratings WHERE user_id = ? AND story_id = ?',
        [userId, storyId]
      );

      if (existing.length > 0) {
        await connection.execute(
          `UPDATE user_story_ratings
           SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND story_id = ?`,
          [rating, comment, userId, storyId]
        );
        return await this.findOne({ userId, storyId });
      }

      const [result] = await connection.execute(
        `INSERT INTO user_story_ratings (user_id, story_id, rating, comment)
         VALUES (?, ?, ?, ?)`,
        [userId, storyId, rating, comment]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

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

  static async findOneAndUpdate(query, updateData = {}, options = {}) {
    const existing = await this.findOne(query);
    if (!existing && options.upsert) {
      return await this.create({ ...query, ...updateData });
    }
    if (!existing) {
      return null;
    }

    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      if (updateData.rating !== undefined) {
        fields.push('rating = ?');
        values.push(this.validateRating(updateData.rating));
      }

      if (updateData.comment !== undefined) {
        fields.push('comment = ?');
        values.push(this.validateComment(updateData.comment));
      }

      if (fields.length === 0) {
        return existing;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(existing.userId, existing.storyId);

      await connection.execute(
        `UPDATE user_story_ratings SET ${fields.join(', ')} WHERE user_id = ? AND story_id = ?`,
        values
      );

      return await this.findOne(query);
    } finally {
      connection.release();
    }
  }

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

      sql += ' ORDER BY updated_at DESC';

      if (query.limit) {
        const limit = Math.max(0, parseInt(query.limit, 10) || 0);
        sql += ` LIMIT ${limit}`;
      }

      if (query.skip) {
        const skip = Math.max(0, parseInt(query.skip, 10) || 0);
        sql += ` OFFSET ${skip}`;
      }

      const [ratings] = await connection.query(sql, params);
      return ratings.map((row) => new UserStoryRating(row));
    } finally {
      connection.release();
    }
  }

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

  static async findOneAndDelete(query = {}) {
    const existing = await this.findOne(query);
    if (!existing) {
      return null;
    }
    await this.findByIdAndDelete(existing.id);
    return existing;
  }

  static async getStoryRatingStats(storyId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `SELECT COUNT(*) AS count, AVG(rating) AS average, SUM(rating) AS total
         FROM user_story_ratings
         WHERE story_id = ?`,
        [storyId]
      );
      return {
        count: result[0].count || 0,
        average: result[0].average ? Number(result[0].average) : 0,
        total: result[0].total || 0
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = UserStoryRating;
