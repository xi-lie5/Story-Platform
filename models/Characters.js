const { pool } = require('../backend/config/database');
const { v4: uuidv4 } = require('uuid');

class Character {
  /**
   * 创建角色
   * @param {Object} characterData - 角色数据
   * @returns {Promise<Object>} 创建的角色对象
   */
  static async create(characterData) {
    const connection = await pool.getConnection();
    try {
      const { story_id, name, description } = characterData;
      
      // 验证必填字段
      if (!story_id || !name || !description) {
        throw new Error('故事ID、角色名称和描述必填');
      }
      
      // 验证长度
      if (name.length > 100) {
        throw new Error('角色名称不能超过100个字符');
      }
      if (description.length > 1000) {
        throw new Error('角色描述不能超过1000个字符');
      }
      
      // 验证故事是否存在
      const [stories] = await connection.execute(
        'SELECT id FROM stories WHERE id = ?',
        [story_id]
      );
      if (stories.length === 0) {
        throw new Error('故事不存在');
      }
      
      // 检查同一故事中是否已存在同名角色
      const [existing] = await connection.execute(
        'SELECT id FROM characters WHERE story_id = ? AND name = ?',
        [story_id, name.trim()]
      );
      if (existing.length > 0) {
        throw new Error(`角色名称"${name}"已存在`);
      }
      
      const characterId = uuidv4();
      
      await connection.execute(
        `INSERT INTO characters (id, story_id, name, description) 
         VALUES (?, ?, ?, ?)`,
        [characterId, story_id, name.trim(), description.trim()]
      );
      
      return await this.findById(characterId);
    } finally {
      connection.release();
    }
  }
  
  /**
   * 根据ID查找角色
   * @param {String} id - 角色ID
   * @returns {Promise<Object|null>} 角色对象或null
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [characters] = await connection.execute(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      return characters[0] || null;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 获取故事的所有角色
   * @param {Number} storyId - 故事ID
   * @param {Object} options - 查询选项（name）
   * @returns {Promise<Array>} 角色列表
   */
  static async getStoryCharacters(storyId, options = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM characters WHERE story_id = ?';
      const params = [storyId];
      
      if (options.name) {
        query += ' AND name LIKE ?';
        params.push(`%${options.name}%`);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [characters] = await connection.execute(query, params);
      return characters;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 更新角色
   * @param {String} id - 角色ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的角色对象
   */
  static async findByIdAndUpdate(id, updateData) {
    const connection = await pool.getConnection();
    try {
      // 先获取现有角色
      const character = await this.findById(id);
      if (!character) {
        throw new Error('角色不存在');
      }
      
      const fields = [];
      const values = [];
      
      if (updateData.name !== undefined) {
        if (updateData.name.length > 100) {
          throw new Error('角色名称不能超过100个字符');
        }
        
        // 如果更新名称，检查是否重复（排除自身）
        if (updateData.name.trim() !== character.name) {
          const [existing] = await connection.execute(
            'SELECT id FROM characters WHERE story_id = ? AND name = ? AND id != ?',
            [character.story_id, updateData.name.trim(), id]
          );
          if (existing.length > 0) {
            throw new Error(`角色名称"${updateData.name}"已存在`);
          }
        }
        
        fields.push('name = ?');
        values.push(updateData.name.trim());
      }
      
      if (updateData.description !== undefined) {
        if (updateData.description.length > 1000) {
          throw new Error('角色描述不能超过1000个字符');
        }
        fields.push('description = ?');
        values.push(updateData.description.trim());
      }
      
      if (fields.length === 0) {
        return character;
      }
      
      values.push(id);
      
      const conn = await pool.getConnection();
      try {
        await conn.execute(
          `UPDATE characters SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      } finally {
        conn.release();
      }
      
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 删除角色
   * @param {String} id - 角色ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM characters WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 批量创建角色
   * @param {Array} charactersData - 角色数据数组
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Object>} 处理结果
   */
  static async bulkCreateCharacters(charactersData, storyId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = {
        created: [],
        errors: []
      };
      
      for (const charData of charactersData) {
        try {
          // 检查是否已存在同名角色（同一故事中）
          const [existing] = await connection.execute(
            'SELECT id FROM characters WHERE story_id = ? AND name = ?',
            [storyId, charData.name]
          );
          
          if (existing.length > 0) {
            throw new Error(`角色名称"${charData.name}"已存在`);
          }
          
          const character = await this.create({
            ...charData,
            story_id: storyId
          });
          results.created.push(character);
        } catch (error) {
          results.errors.push({
            characterData: charData,
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
   * 批量更新角色
   * @param {Array} charactersData - 角色数据数组
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Object>} 处理结果
   */
  static async bulkUpdateCharacters(charactersData, storyId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = {
        updated: [],
        errors: []
      };
      
      for (const charData of charactersData) {
        try {
          if (!charData.id) {
            throw new Error('角色ID必填');
          }
          
          const character = await this.findById(charData.id);
          if (!character || character.story_id !== storyId) {
            throw new Error('角色不存在或不属于该故事');
          }
          
          // 如果更新名称，检查名称是否重复（排除自身）
          if (charData.name && charData.name !== character.name) {
            const [existing] = await connection.execute(
              'SELECT id FROM characters WHERE story_id = ? AND name = ? AND id != ?',
              [storyId, charData.name.trim(), charData.id]
            );
            
            if (existing.length > 0) {
              throw new Error(`角色名称"${charData.name}"已存在`);
            }
          }
          
          const updated = await this.findByIdAndUpdate(charData.id, charData);
          results.updated.push(updated);
        } catch (error) {
          results.errors.push({
            characterData: charData,
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
   * 删除故事的所有角色
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Number>} 删除的角色数量
   */
  static async deleteStoryCharacters(storyId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM characters WHERE story_id = ?',
        [storyId]
      );
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 统计故事角色数量
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Number>} 角色数量
   */
  static async countStoryCharacters(storyId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as count FROM characters WHERE story_id = ?',
        [storyId]
      );
      return result[0].count;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 查找角色（支持多种查询条件）
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>} 角色列表
   */
  static async findOne(query) {
    const connection = await pool.getConnection();
    try {
      let sql = 'SELECT * FROM characters WHERE 1=1';
      const params = [];
      
      if (query.story_id) {
        sql += ' AND story_id = ?';
        params.push(query.story_id);
      }
      
      if (query.name) {
        sql += ' AND name = ?';
        params.push(query.name);
      }
      
      if (query.id) {
        sql += ' AND id = ?';
        params.push(query.id);
      }
      
      sql += ' LIMIT 1';
      
      const [characters] = await connection.execute(sql, params);
      return characters[0] || null;
    } finally {
      connection.release();
    }
  }
}

module.exports = Character;
