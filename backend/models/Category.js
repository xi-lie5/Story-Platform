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

      if (!name) {
        throw new Error('分类名称必填');
      }

      const [existing] = await connection.execute(
        'SELECT id FROM categories WHERE name = ?',
        [name.trim()]
      );
      if (existing.length > 0) {
        throw new Error('Category already exists');
      }

      const [result] = await connection.execute(
        `INSERT INTO categories (name, description) VALUES (?, ?)`,
        [name.trim(), description || '']
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找分类
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
   * 根据条件查询单个分类（兼容 Mongoose 风格命名）
   */
  static async findOne(query) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM categories WHERE 1=1';
      const params = [];
      if (query.name) { sql += ' AND name = ?'; params.push(query.name); }
      if (query.id) { sql += ' AND id = ?'; params.push(query.id); }
      sql += ' LIMIT 1';
      const [categories] = await connection.execute(sql, params);
      return categories.length > 0 ? new Category(categories[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * 保存分类（实例方法）
   */
  async save() {
    const connection = await pool.getConnection();
    try {
      if (this.id) {
        const fields = [];
        const values = [];
        if (this.name !== undefined) { fields.push('name = ?'); values.push(this.name.trim()); }
        if (this.description !== undefined) { fields.push('description = ?'); values.push(this.description); }
        if (this.storyCount !== undefined) { fields.push('story_count = ?'); values.push(this.storyCount); }
        if (fields.length === 0) return await Category.findById(this.id);
        values.push(this.id);
        await connection.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
        return await Category.findById(this.id);
      } else {
        return await Category.create({ name: this.name, description: this.description });
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 更新分类（兼容 Mongoose 风格命名）
   */
  static async findByIdAndUpdate(id, updateData) {
    const category = await this.findById(id);
    if (!category) throw new Error('Category not found');
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) category[key] = updateData[key];
    });
    return await category.save();
  }

  /**
   * 删除分类
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM categories WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 查找所有分类
   * LIMIT/OFFSET 使用参数化查询（?）防止 SQL 注入
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM categories WHERE 1=1';
      const params = [];
      if (query.name) { sql += ' AND name LIKE ?'; params.push(`%${query.name}%`); }
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
      const [categories] = await connection.query(sql, params);
      return categories.map(c => new Category(c));
    } finally {
      connection.release();
    }
  }

  /**
   * 统计分类数量（兼容 Mongoose 风格命名）
   */
  static async countDocuments() {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute('SELECT COUNT(*) as count FROM categories');
      return result[0].count;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量创建分类（兼容 Mongoose 风格命名）
   */
  static async insertMany(categoriesData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const created = [];
      for (const categoryData of categoriesData) {
        try {
          const [existing] = await connection.execute(
            'SELECT id FROM categories WHERE name = ?',
            [categoryData.name.trim()]
          );
          if (existing.length > 0) {
            const existingCategory = await this.findById(existing[0].id);
            if (existingCategory) {
              created.push(existingCategory);
              console.log(`分类 "${categoryData.name}" 已存在，跳过创建`);
            }
          } else {
            const category = await this.create(categoryData);
            created.push(category);
            console.log(`成功创建分类: ${categoryData.name}`);
          }
        } catch (error) {
          console.warn(`创建分类失败: ${categoryData.name}`, error.message);
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
