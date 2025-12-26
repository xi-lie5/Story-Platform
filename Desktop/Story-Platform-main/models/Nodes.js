const { pool } = require('../backend/config/database');
const { v4: uuidv4 } = require('uuid');

class StoryNode {
  /**
   * 创建节点
   * @param {Object} nodeData - 节点数据
   * @returns {Promise<Object>} 创建的节点对象
   */
  static async create(nodeData) {
    const connection = await pool.getConnection();
    try {
      const {
        story_id,
        title,
        content,
        is_root = false,
        type = 'regular',
        x = 0,
        y = 0
      } = nodeData;
      
      // 验证必填字段
      if (!story_id || !title || !content) {
        throw new Error('故事ID、节点标题和内容必填');
      }
      
      // 验证节点类型
      const validTypes = ['regular', 'branch', 'end'];
      if (!validTypes.includes(type)) {
        throw new Error(`节点类型必须是: ${validTypes.join(', ')}`);
      }
      
      // 如果是根节点，检查是否已存在
      if (is_root) {
        const [existing] = await connection.execute(
          'SELECT id FROM story_nodes WHERE story_id = ? AND is_root = TRUE',
          [story_id]
        );
        if (existing.length > 0) {
          throw new Error('该故事已存在根节点');
        }
      }
      
      // 验证故事是否存在
      const [stories] = await connection.execute(
        'SELECT id FROM stories WHERE id = ?',
        [story_id]
      );
      if (stories.length === 0) {
        throw new Error('故事不存在');
      }
      
      const nodeId = uuidv4();
      
      await connection.execute(
        `INSERT INTO story_nodes (id, story_id, title, content, is_root, type, x, y) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nodeId, story_id, title.trim(), content.trim(), is_root, type, x, y]
      );
      
      return await this.findById(nodeId);
    } finally {
      connection.release();
    }
  }
  
  /**
   * 根据ID查找节点
   * @param {String} id - 节点ID
   * @returns {Promise<Object|null>} 节点对象或null
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [nodes] = await connection.execute(
        'SELECT * FROM story_nodes WHERE id = ?',
        [id]
      );
      return nodes[0] || null;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 根据故事ID获取根节点
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Object|null>} 根节点对象或null
   */
  static async getRootNode(storyId) {
    const connection = await pool.getConnection();
    try {
      const [nodes] = await connection.execute(
        'SELECT * FROM story_nodes WHERE story_id = ? AND is_root = TRUE LIMIT 1',
        [storyId]
      );
      return nodes[0] || null;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 获取故事的所有节点
   * @param {Number} storyId - 故事ID
   * @param {Object} options - 查询选项（type）
   * @returns {Promise<Array>} 节点列表
   */
  static async getStoryNodes(storyId, options = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM story_nodes WHERE story_id = ?';
      const params = [storyId];
      
      if (options.type) {
        query += ' AND type = ?';
        params.push(options.type);
      }
      
      query += ' ORDER BY created_at ASC';
      
      const [nodes] = await connection.execute(query, params);
      return nodes;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 更新节点
   * @param {String} id - 节点ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的节点对象
   */
  static async findByIdAndUpdate(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];
      
      if (updateData.title !== undefined) {
        if (updateData.title.length > 255) {
          throw new Error('节点标题不能超过255个字符');
        }
        fields.push('title = ?');
        values.push(updateData.title.trim());
      }
      
      if (updateData.content !== undefined) {
        fields.push('content = ?');
        values.push(updateData.content.trim());
      }
      
      if (updateData.type !== undefined) {
        const validTypes = ['regular', 'branch', 'end'];
        if (!validTypes.includes(updateData.type)) {
          throw new Error(`节点类型必须是: ${validTypes.join(', ')}`);
        }
        fields.push('type = ?');
        values.push(updateData.type);
      }
      
      if (updateData.x !== undefined) {
        fields.push('x = ?');
        values.push(updateData.x);
      }
      
      if (updateData.y !== undefined) {
        fields.push('y = ?');
        values.push(updateData.y);
      }
      
      if (fields.length === 0) {
        return await this.findById(id);
      }
      
      values.push(id);
      
      await connection.execute(
        `UPDATE story_nodes SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return await this.findById(id);
    } finally {
      connection.release();
    }
  }
  
  /**
   * 删除节点（级联删除相关分支）
   * @param {String} id - 节点ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      // 由于外键约束，删除节点会自动级联删除相关分支
      const [result] = await connection.execute(
        'DELETE FROM story_nodes WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 批量处理节点（创建或更新）
   * @param {Array} nodes - 节点数据数组
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Object>} 处理结果
   */
  static async bulkProcessNodes(nodes, storyId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = {
        created: [],
        updated: [],
        errors: []
      };
      
      for (const nodeData of nodes) {
        try {
          if (nodeData.id) {
            // 更新现有节点
            const existing = await this.findById(nodeData.id);
            if (existing && existing.story_id === storyId) {
              const updated = await this.findByIdAndUpdate(nodeData.id, nodeData);
              results.updated.push(updated);
            } else {
              throw new Error(`节点不存在或不属于该故事: ${nodeData.id}`);
            }
          } else {
            // 创建新节点
            const newNode = await this.create({
              ...nodeData,
              story_id: storyId
            });
            results.created.push(newNode);
          }
        } catch (error) {
          results.errors.push({
            nodeData,
            error: error.message
          });
        }
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 删除故事的所有节点
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Number>} 删除的节点数量
   */
  static async deleteStoryNodes(storyId) {
    const connection = await pool.getConnection();
    try {
      // 由于外键约束，删除故事时会自动级联删除节点
      // 但这里提供显式删除方法
      const [result] = await connection.execute(
        'DELETE FROM story_nodes WHERE story_id = ?',
        [storyId]
      );
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 查找节点（支持多种查询条件）
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>} 节点列表
   */
  static async find(query = {}) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM story_nodes WHERE 1=1';
      const params = [];
      
      if (query.story_id) {
        sql += ' AND story_id = ?';
        params.push(query.story_id);
      }
      
      if (query.type) {
        sql += ' AND type = ?';
        params.push(query.type);
      }
      
      if (query.is_root !== undefined) {
        sql += ' AND is_root = ?';
        params.push(query.is_root);
      }
      
      sql += ' ORDER BY created_at ASC';
      
      const [nodes] = await connection.execute(sql, params);
      return nodes;
    } finally {
      connection.release();
    }
  }
}

module.exports = StoryNode;
