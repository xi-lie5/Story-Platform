const { pool } = require('../config/database');

class Story {
  /**
   * 创建故事
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
        throw new Error('Story title, author ID and description are required');
      }

      // 验证长度
      if (title.length > 100) {
        throw new Error('Story title cannot exceed 100 characters');
      }
      if (description.length > 500) {
        throw new Error('Story description cannot exceed 500 characters');
      }

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
   * 更新故事（兼容 Mongoose 风格命名）
   */
  static async findByIdAndUpdate(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      if (updateData.title !== undefined) {
        if (updateData.title.length > 100) {
          throw new Error('Story title cannot exceed 100 characters');
        }
        fields.push('title = ?');
        values.push(updateData.title.trim());
      }

      if (updateData.description !== undefined) {
        if (updateData.description.length > 500) {
          throw new Error('Story description cannot exceed 500 characters');
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

      if (updateData.rating !== undefined) {
        fields.push('rating = ?');
        values.push(updateData.rating);
      }

      if (updateData.ratingCount !== undefined || updateData.rating_count !== undefined) {
        fields.push('rating_count = ?');
        values.push(updateData.ratingCount !== undefined ? updateData.ratingCount : updateData.rating_count);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      // 自动更新 updated_at 字段
      fields.push('updated_at = CURRENT_TIMESTAMP');

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
   * LIMIT/OFFSET 使用参数化查询（?）防止 SQL 注入
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

      // 查询列表 - LIMIT/OFFSET 参数化
      const limitValue = parseInt(limit, 10);
      const offsetValue = parseInt(offset, 10);
      const [stories] = await connection.execute(
        `SELECT * FROM stories WHERE author_id = ? ORDER BY ${sort} LIMIT ? OFFSET ?`,
        [authorId, limitValue, offsetValue]
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
   * LIMIT/OFFSET 使用参数化查询（?）防止 SQL 注入
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
        if (Array.isArray(query.status)) {
          // 如果 status 是数组，使用 IN 查询
          const placeholders = query.status.map(() => '?').join(',');
          sql += ` AND s.status IN (${placeholders})`;
          params.push(...query.status);
        } else {
          sql += ' AND s.status = ?';
          params.push(query.status);
        }
      }

      if (query.isPublic !== undefined) {
        sql += ' AND s.is_public = ?';
        params.push(query.isPublic ? 1 : 0);
      } else if (query.is_public !== undefined) {
        sql += ' AND s.is_public = ?';
        params.push(query.is_public ? 1 : 0);
      }

      // 创作模式过滤：'manual' 手动创作 / 'ai' AI 互动
      if (query.creation_mode || query.creationMode) {
        sql += ' AND s.creation_mode = ?';
        params.push(query.creation_mode || query.creationMode);
      }

      // 完结状态过滤：是否存在 type='end' 的结局节点
      if (query.hasEnding === true) {
        sql += " AND EXISTS (SELECT 1 FROM story_nodes n WHERE n.story_id = s.id AND n.type = 'end')";
      } else if (query.hasEnding === false) {
        sql += " AND NOT EXISTS (SELECT 1 FROM story_nodes n WHERE n.story_id = s.id AND n.type = 'end')";
      }

      let searchPattern = null;
      if (query.search || query.$text) {
        const searchTerm = query.search || (query.$text && query.$text.$search);
        if (searchTerm && searchTerm.trim()) {
          // 转义搜索模式中的特殊字符，防止 SQL 注入
          const escapedTerm = searchTerm.trim().replace(/[%_\\]/g, '\\$&');
          searchPattern = `%${escapedTerm}%`;
          sql += ' AND (s.title LIKE ? OR s.description LIKE ?)';
          params.push(searchPattern, searchPattern);
        }
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
      // 如果有搜索，优先按搜索相关性排序（标题匹配优先于描述匹配）
      if (searchPattern) {
        // 使用 CASE WHEN 实现优先级排序：
        // 1. 标题匹配（优先级最高，值为1）
        // 2. 描述匹配但标题不匹配（优先级次之，值为2）
        sql += ` ORDER BY
          CASE
            WHEN s.title LIKE ? THEN 1
            WHEN s.description LIKE ? AND s.title NOT LIKE ? THEN 2
            ELSE 2
          END ASC`;
        params.push(searchPattern, searchPattern, searchPattern);

        // 在搜索优先级排序后，按照原始排序字段排序
        if (options.sort && typeof options.sort === 'object' && Object.keys(options.sort).length > 0) {
          const sortMap = {
            'createdAt': 's.created_at',
            'created_at': 's.created_at',
            'updatedAt': 's.updated_at',
            'updated_at': 's.updated_at',
            'view': 's.view_count',
            'view_count': 's.view_count',
            'rating': 's.rating'
          };
          const sortKey = Object.keys(options.sort)[0];
          const sortField = sortMap[sortKey] || 's.created_at';
          const sortOrder = options.sort[sortKey] === -1 ? 'DESC' : 'ASC';
          sql += `, ${sortField} ${sortOrder}`;
        } else {
          // 默认按创建时间倒序
          sql += ', s.created_at DESC';
        }
      } else {
        // 没有搜索时，按照原始排序
        if (options.sort && typeof options.sort === 'object' && Object.keys(options.sort).length > 0) {
          const sortMap = {
            'createdAt': 's.created_at',
            'created_at': 's.created_at',
            'updatedAt': 's.updated_at',
            'updated_at': 's.updated_at',
            'view': 's.view_count',
            'view_count': 's.view_count',
            'rating': 's.rating'
          };
          const sortKey = Object.keys(options.sort)[0];
          const sortField = sortMap[sortKey] || 's.created_at';
          const sortOrder = options.sort[sortKey] === -1 ? 'DESC' : 'ASC';
          sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
          sql += ' ORDER BY s.created_at DESC';
        }
      }

      // LIMIT/OFFSET 参数化
      if (options.limit !== undefined && options.limit !== null) {
        const limitValue = parseInt(options.limit, 10);
        if (!isNaN(limitValue) && limitValue > 0) {
          sql += ' LIMIT ?';
          params.push(limitValue);
        }
      }

      if (options.skip !== undefined && options.skip !== null) {
        const skipValue = parseInt(options.skip, 10);
        if (!isNaN(skipValue) && skipValue >= 0) {
          sql += ' OFFSET ?';
          params.push(skipValue);
        }
      }

      const [stories] = await connection.query(sql, params);

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
   * 统计故事数量（兼容 Mongoose 风格命名）
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
        if (Array.isArray(query.status)) {
          // 处理状态数组（用于查询多个状态）
          const placeholders = query.status.map(() => '?').join(',');
          sql += ` AND status IN (${placeholders})`;
          params.push(...query.status);
        } else {
          sql += ' AND status = ?';
          params.push(query.status);
        }
      }

      if (query.isPublic !== undefined) {
        sql += ' AND is_public = ?';
        params.push(query.isPublic ? 1 : 0);
      } else if (query.is_public !== undefined) {
        sql += ' AND is_public = ?';
        params.push(query.is_public ? 1 : 0);
      }

      // 创作模式过滤：'manual' 手动创作 / 'ai' AI 互动
      if (query.creation_mode || query.creationMode) {
        sql += ' AND creation_mode = ?';
        params.push(query.creation_mode || query.creationMode);
      }

      // 完结状态过滤：是否存在 type='end' 的结局节点（与 find 保持一致）
      if (query.hasEnding === true) {
        sql += " AND EXISTS (SELECT 1 FROM story_nodes n WHERE n.story_id = stories.id AND n.type = 'end')";
      } else if (query.hasEnding === false) {
        sql += " AND NOT EXISTS (SELECT 1 FROM story_nodes n WHERE n.story_id = stories.id AND n.type = 'end')";
      }

      if (query.search || query.$text) {
        const searchTerm = query.search || (query.$text && query.$text.$search);
        if (searchTerm && searchTerm.trim()) {
          const searchPattern = `%${searchTerm.trim()}%`;
          sql += ' AND (title LIKE ? OR description LIKE ?)';
          params.push(searchPattern, searchPattern);
        }
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
