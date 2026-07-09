const { pool } = require('../config/database');

class StoryComment {
  static async create({ storyId, userId, nodeId = null, content }) {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute(
        `INSERT INTO story_comments (story_id, user_id, node_id, content)
         VALUES (?, ?, ?, ?)`,
        [storyId, userId, nodeId || null, content.trim()]
      );
      return await this.findById(result.insertId);
    } finally {
      conn.release();
    }
  }

  static async findById(id) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT c.*, u.username, u.avatar
         FROM story_comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0] ? this.format(rows[0]) : null;
    } finally {
      conn.release();
    }
  }

  static async findByStory(storyId, { page = 1, limit = 20, nodeId = null } = {}) {
    const conn = await pool.getConnection();
    try {
      const safePage = Math.max(parseInt(page, 10) || 1, 1);
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const offset = (safePage - 1) * safeLimit;
      const params = [storyId];
      let where = 'WHERE c.story_id = ?';

      if (nodeId) {
        where += ' AND c.node_id = ?';
        params.push(nodeId);
      }

      const [countRows] = await conn.query(
        `SELECT COUNT(*) AS total FROM story_comments c ${where}`,
        params
      );
      const total = countRows[0]?.total || 0;

      const [rows] = await conn.query(
        `SELECT c.*, u.username, u.avatar
         FROM story_comments c
         LEFT JOIN users u ON c.user_id = u.id
         ${where}
         ORDER BY c.created_at DESC
         LIMIT ${safeLimit} OFFSET ${offset}`,
        params
      );

      return {
        comments: rows.map((row) => this.format(row)),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit)
        }
      };
    } finally {
      conn.release();
    }
  }

  static async deleteById(id) {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute('DELETE FROM story_comments WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  static format(row) {
    return {
      id: row.id,
      storyId: row.story_id,
      userId: row.user_id,
      nodeId: row.node_id,
      content: row.content,
      author: {
        id: row.user_id,
        username: row.username || '用户',
        avatar: row.avatar || null
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = StoryComment;