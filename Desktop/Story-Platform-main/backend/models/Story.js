const { pool } = require('../config/database');

class Story {
  /**
   * 创建故事
   * @param {Object} storyData - 故事数据
   * @returns {Promise<Object>} 创建的故事对象
   */
  static async create(storyData) {
    const connection = await pool.getConnection();
    try {
      const { 
        title, 
        author, 
        author_id, 
        category, 
        categoryId, 
        category_id,
        coverImage, 
        cover_image, 
        description,
        status,
        isPublic,
        is_public
      } = storyData;
      const authorId = author || author_id;
      const categoryIdValue = category || categoryId || category_id;
      const coverImg = coverImage || cover_image;
      const storyStatus = status || 'draft';
      const isPublicValue = isPublic !== undefined ? isPublic : (is_public !== undefined ? is_public : false);
      
      // 验证必填字段
      if (!title || !authorId || !description) {
        throw new Error('故事标题、作者ID和简介必填');
      }
      
      // 验证长度
      if (title.length > 100) {
        throw new Error('故事标题不能超过100个字符');
      }
      if (description.length > 500) {
        throw new Error('故事简介不能超过500个字符');
      }
      
      // 验证状态
      const validStatuses = ['draft', 'pending', 'published', 'rejected', 'unpublished'];
      if (storyStatus && !validStatuses.includes(storyStatus)) {
        throw new Error(`状态必须是: ${validStatuses.join(', ')}`);
      }
      
      const [result] = await connection.execute(
        `INSERT INTO stories (title, author_id, category_id, cover_image, description, status, is_public) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(), 
          authorId, 
          categoryIdValue || null,
          coverImg || '/coverImage/1.png', 
          description.trim(),
          storyStatus,
          isPublicValue
        ]
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
      
      if (updateData.coverImage !== undefined) {
        fields.push('cover_image = ?');
        values.push(updateData.coverImage);
      }
      
      if (updateData.category !== undefined || updateData.categoryId !== undefined || updateData.category_id !== undefined) {
        fields.push('category_id = ?');
        values.push(updateData.category || updateData.categoryId || updateData.category_id || null);
      }
      
      if (updateData.status !== undefined) {
        const validStatuses = ['draft', 'pending', 'published', 'rejected', 'unpublished'];
        if (!validStatuses.includes(updateData.status)) {
          throw new Error(`状态必须是: ${validStatuses.join(', ')}`);
        }
        fields.push('status = ?');
        values.push(updateData.status);
      }
      
      if (updateData.isPublic !== undefined || updateData.is_public !== undefined) {
        fields.push('is_public = ?');
        values.push(updateData.isPublic !== undefined ? updateData.isPublic : updateData.is_public);
      }
      
      if (updateData.viewCount !== undefined || updateData.view_count !== undefined) {
        fields.push('view_count = ?');
        values.push(updateData.viewCount !== undefined ? updateData.viewCount : updateData.view_count);
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

  /**
   * 查找故事（支持多种查询条件）
   * @param {Object} query - 查询条件
   * @param {Object} options - 查询选项（sort, limit, skip, populate）
   * @returns {Promise<Array>} 故事列表
   */
  static async find(query = {}, options = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT s.* FROM stories s WHERE 1=1';
      const params = [];

      if (query.author || query.author_id) {
        sql += ' AND s.author_id = ?';
        params.push(query.author || query.author_id);
      }

      if (query.category || query.category_id || query.categoryId) {
        sql += ' AND s.category_id = ?';
        params.push(query.category || query.category_id || query.categoryId);
      }

      if (query.status) {
        sql += ' AND s.status = ?';
        params.push(query.status);
      }

      if (query.isPublic !== undefined) {
        sql += ' AND s.is_public = ?';
        params.push(query.isPublic);
      }

      if (query.is_public !== undefined) {
        sql += ' AND s.is_public = ?';
        params.push(query.is_public);
      }

      // 处理日期范围查询
      if (query.createdAt) {
        if (query.createdAt.$gte) {
          sql += ' AND s.created_at >= ?';
          params.push(query.createdAt.$gte);
        }
        if (query.createdAt.$lte) {
          sql += ' AND s.created_at <= ?';
          params.push(query.createdAt.$lte);
        }
      }

      // 排序
      if (options.sort) {
        const sortMap = {
          'createdAt': 's.created_at',
          'created_at': 's.created_at',
          'updatedAt': 's.updated_at',
          'updated_at': 's.updated_at',
          'view': 's.view_count',
          'view_count': 's.view_count',
          'rating': 's.rating'
        };
        const sortField = sortMap[Object.keys(options.sort)[0]] || 's.created_at';
        const sortOrder = options.sort[Object.keys(options.sort)[0]] === -1 ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${sortField} ${sortOrder}`;
      } else {
        sql += ' ORDER BY s.created_at DESC';
      }

      // 分页
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options.skip) {
        sql += ' OFFSET ?';
        params.push(options.skip);
      }

      const [stories] = await connection.execute(sql, params);

      // 如果需要 populate category 和 author
      if (options.populate && (options.populate.includes('category') || options.populate.includes('author'))) {
        const Category = require('./Category');
        const User = require('./User');
        
        for (let story of stories) {
          if (options.populate.includes('category') && story.category_id) {
            story.category = await Category.findById(story.category_id);
          }
          if (options.populate.includes('author') && story.author_id) {
            story.author = await User.findById(story.author_id);
          }
        }
      }

      return stories;
    } finally {
      connection.release();
    }
  }

  /**
   * 统计故事数量
   * @param {Object} query - 查询条件
   * @returns {Promise<Number>} 故事数量
   */
  static async countDocuments(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT COUNT(*) as count FROM stories WHERE 1=1';
      const params = [];

      if (query.author || query.author_id) {
        sql += ' AND author_id = ?';
        params.push(query.author || query.author_id);
      }

      if (query.category || query.category_id || query.categoryId) {
        sql += ' AND category_id = ?';
        params.push(query.category || query.category_id || query.categoryId);
      }

      if (query.status) {
        sql += ' AND status = ?';
        params.push(query.status);
      }

      if (query.isPublic !== undefined) {
        sql += ' AND is_public = ?';
        params.push(query.isPublic);
      }

      if (query.is_public !== undefined) {
        sql += ' AND is_public = ?';
        params.push(query.is_public);
      }

      if (query.createdAt) {
        if (query.createdAt.$gte) {
          sql += ' AND created_at >= ?';
          params.push(query.createdAt.$gte);
        }
        if (query.createdAt.$lte) {
          sql += ' AND created_at <= ?';
          params.push(query.createdAt.$lte);
        }
      }

      const [result] = await connection.execute(sql, params);
      return result[0].count;
    } finally {
      connection.release();
    }
  }
}

module.exports = Story;
