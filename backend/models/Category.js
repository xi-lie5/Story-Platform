const { pool } = require('../config/database');

class Category {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || '';
    this.storyCount = data.story_count || 0;
    this.story_count = this.storyCount;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * 创建分类
   * @param {Object} categoryData - 分类数据
   * @returns {Promise<Category>} 创建的分类实例
   */
  static async create(categoryData) {
    const connection = await pool.getConnection();
    try {
      const { name, description } = categoryData;

      // 验证必填字段
      if (!name) {
        throw new Error('分类名称必填');
      }

      // 检查分类是否已存在
      const [existing] = await connection.execute(
        'SELECT id FROM categories WHERE name = ?',
        [name.trim()]
      );
      if (existing.length > 0) {
        throw new Error('分类已存在');
      }

      const [result] = await connection.execute(
        `INSERT INTO categories (name, description) 
         VALUES (?, ?)`,
        [name.trim(), description || '']
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找分类
   * @param {Number} id - 分类ID
   * @returns {Promise<Category|null>} 分类实例或null
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [categories] = await connection.execute(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );
      return categories.length > 0 ? new Category(categories[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据名称查找分类
   * @param {String} name - 分类名称
   * @returns {Promise<Category|null>} 分类实例或null
   */
  static async findOne(query) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM categories WHERE 1=1';
      const params = [];

      if (query.name) {
        sql += ' AND name = ?';
        params.push(query.name);
      }

      if (query.id) {
        sql += ' AND id = ?';
        params.push(query.id);
      }

      sql += ' LIMIT 1';

      const [categories] = await connection.execute(sql, params);
      return categories.length > 0 ? new Category(categories[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 保存分类（实例方法）
   * @returns {Promise<Category>} 保存后的分类实例
   */
  async save() {
    const connection = await pool.getConnection();
    try {
      if (this.id) {
        // 更新现有分类
        const fields = [];
        const values = [];

        if (this.name !== undefined) {
          fields.push('name = ?');
          values.push(this.name.trim());
        }

        if (this.description !== undefined) {
          fields.push('description = ?');
          values.push(this.description);
        }

        if (this.storyCount !== undefined) {
          fields.push('story_count = ?');
          values.push(this.storyCount);
        }

        if (fields.length === 0) {
          return await Category.findById(this.id);
        }

        values.push(this.id);

        await connection.execute(
          `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
          values
        );

        return await Category.findById(this.id);
      } else {
        // 创建新分类
        return await Category.create({
          name: this.name,
          description: this.description
        });
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 更新分类
   * @param {Number} id - 分类ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Category>} 更新后的分类实例
   */
  static async findByIdAndUpdate(id, updateData) {
    const category = await this.findById(id);
    if (!category) {
      throw new Error('分类不存在');
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        category[key] = updateData[key];
      }
    });

    return await category.save();
  }

  /**
   * 删除分类
   * @param {Number} id - 分类ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM categories WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找所有分类
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 分类列表
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM categories WHERE 1=1';
      const params = [];

      if (query.name) {
        sql += ' AND name LIKE ?';
        params.push(`%${query.name}%`);
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

      const [categories] = await connection.execute(sql, params);
      return categories.map(c => new Category(c));
    } finally {
      connection.release();
    }
  }

  /**
   * 统计分类数量
   * @returns {Promise<Number>} 分类数量
   */
  static async countDocuments() {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as count FROM categories'
      );
      return result[0].count;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量创建分类
   * @param {Array} categoriesData - 分类数据数组
   * @returns {Promise<Array>} 创建的分类列表
   */
  static async insertMany(categoriesData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const created = [];
      for (const categoryData of categoriesData) {
        try {
          // 检查分类是否已存在
          const [existing] = await connection.execute(
            'SELECT id FROM categories WHERE name = ?',
            [categoryData.name.trim()]
          );
          
          if (existing.length > 0) {
            // 如果分类已存在，获取现有分类
            const existingCategory = await this.findById(existing[0].id);
            if (existingCategory) {
              created.push(existingCategory);
              console.log(`分类 "${categoryData.name}" 已存在，跳过创建`);
            }
          } else {
            // 如果分类不存在，创建新分类
          const category = await this.create(categoryData);
          created.push(category);
            console.log(`成功创建分类: ${categoryData.name}`);
          }
        } catch (error) {
          console.warn(`创建分类失败: ${categoryData.name}`, error.message);
          // 继续处理下一个分类，不中断整个流程
        }
      }

      await connection.commit();
      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新分类的故事数量
   * @param {Number} categoryId - 分类ID
   * @param {Number} increment - 增量（正数增加，负数减少）
   * @returns {Promise<Boolean>} 是否成功
   */
  static async updateStoryCount(categoryId, increment) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE categories SET story_count = story_count + ? WHERE id = ?',
        [increment, categoryId]
      );
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = Category;
