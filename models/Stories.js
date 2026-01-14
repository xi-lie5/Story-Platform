const { pool } = require('../backend/config/database');

class Story {
  /**
   * 创建故事
   * @param {Object} storyData - 故事数据
   * @returns {Promise<Object>} 创建的故事对象
   */
  static async create(storyData) {
    const connection = await pool.getConnection();
    try {
      const { title, author_id, cover_image, description } = storyData;
      
      // 验证必填字段
      if (!title || !author_id || !description) {
        throw new Error('故事标题、作者ID和简介必填');
      }
      
      // 验证长度
      if (title.length > 100) {
        throw new Error('故事标题不能超过100个字符');
      }
      if (description.length > 500) {
        throw new Error('故事简介不能超过500个字符');
      }
      
      const [result] = await connection.execute(
        `INSERT INTO stories (title, author_id, cover_image, description) 
         VALUES (?, ?, ?, ?)`,
        [title.trim(), author_id, cover_image || '/coverImage/1.png', description.trim()]
      );
      
      const [stories] = await connection.execute(
        'SELECT * FROM stories WHERE id = ?',
        [result.insertId]
      );
      
      return stories[0];
    } finally {
      connection.release();
    }
  }
  
  /**
   * 根据ID查找故事
   * @param {Number} id - 故事ID
   * @returns {Promise<Object|null>} 故事对象或null
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [stories] = await connection.execute(
        'SELECT * FROM stories WHERE id = ?',
        [id]
      );
      return stories[0] || null;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 更新故事
   * @param {Number} id - 故事ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的故事对象
   */
  static async findByIdAndUpdate(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];
      
      if (updateData.title !== undefined) {
        if (updateData.title.length > 100) {
          throw new Error('故事标题不能超过100个字符');
        }
        fields.push('title = ?');
        values.push(updateData.title.trim());
      }
      
      if (updateData.description !== undefined) {
        if (updateData.description.length > 500) {
          throw new Error('故事简介不能超过500个字符');
        }
        fields.push('description = ?');
        values.push(updateData.description.trim());
      }
      
      if (updateData.cover_image !== undefined) {
        fields.push('cover_image = ?');
        values.push(updateData.cover_image);
      }
      
      if (fields.length === 0) {
        return await this.findById(id);
      }
      
      values.push(id);
      
      await connection.execute(
        `UPDATE stories SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return await this.findById(id);
    } finally {
      connection.release();
    }
  }
  
  /**
   * 删除故事（级联删除相关数据）
   * @param {Number} id - 故事ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 由于外键约束，删除故事会自动级联删除节点、分支和角色
      const [result] = await connection.execute(
        'DELETE FROM stories WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 根据作者ID查找故事列表
   * @param {Number} authorId - 作者ID
   * @param {Object} options - 查询选项（page, limit, sort）
   * @returns {Promise<Object>} 故事列表和总数
   */
  static async findByAuthor(authorId, options = {}) {
    const connection = await pool.getConnection();
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;
      const sort = options.sort || 'created_at DESC';
      
      // 查询总数
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM stories WHERE author_id = ?',
        [authorId]
      );
      const total = countResult[0].total;
      
      // 查询列表
      const [stories] = await connection.execute(
        `SELECT * FROM stories WHERE author_id = ? ORDER BY ${sort} LIMIT ? OFFSET ?`,
        [authorId, limit, offset]
      );
      
      return {
        stories,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = Story;
