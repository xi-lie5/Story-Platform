const { pool } = require('../backend/config/database');
const { v4: uuidv4 } = require('uuid');

class Branch {
  /**
   * 创建分支
   * @param {String} sourceNodeId - 源节点ID
   * @param {String} targetNodeId - 目标节点ID
   * @param {String} context - 分支描述
   * @returns {Promise<Object>} 创建的分支对象
   */
  static async createBranch(sourceNodeId, targetNodeId, context) {
    const connection = await pool.getConnection();
    try {
      // 验证必填字段
      if (!sourceNodeId || !targetNodeId || !context) {
        throw new Error('源节点ID、目标节点ID和分支描述必填');
      }
      
      // 验证长度
      if (context.length > 500) {
        throw new Error('分支描述不能超过500个字符');
      }
      
      // 验证不能连接自己
      if (sourceNodeId === targetNodeId) {
        throw new Error('节点不能连接自己');
      }
      
      // 检查源节点和目标节点是否存在
      const [sourceNodes] = await connection.execute(
        'SELECT story_id FROM story_nodes WHERE id = ?',
        [sourceNodeId]
      );
      if (sourceNodes.length === 0) {
        throw new Error('源节点不存在');
      }
      
      const [targetNodes] = await connection.execute(
        'SELECT story_id FROM story_nodes WHERE id = ?',
        [targetNodeId]
      );
      if (targetNodes.length === 0) {
        throw new Error('目标节点不存在');
      }
      
      // 验证源节点和目标节点是否属于同一个故事
      if (sourceNodes[0].story_id !== targetNodes[0].story_id) {
        throw new Error('源节点和目标节点必须属于同一个故事');
      }
      
      // 检查是否已存在相同的连接
      const [existing] = await connection.execute(
        'SELECT id FROM branches WHERE source_node_id = ? AND target_node_id = ?',
        [sourceNodeId, targetNodeId]
      );
      if (existing.length > 0) {
        throw new Error('已存在相同连接的分支');
      }
      
      const branchId = uuidv4();
      
      await connection.execute(
        `INSERT INTO branches (id, source_node_id, target_node_id, context) 
         VALUES (?, ?, ?, ?)`,
        [branchId, sourceNodeId, targetNodeId, context.trim()]
      );
      
      return await this.findById(branchId);
    } finally {
      connection.release();
    }
  }
  
  /**
   * 根据ID查找分支
   * @param {String} id - 分支ID
   * @returns {Promise<Object|null>} 分支对象或null
   */
  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [branches] = await connection.execute(
        'SELECT * FROM branches WHERE id = ?',
        [id]
      );
      return branches[0] || null;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 获取节点的所有出向分支
   * @param {String} sourceNodeId - 源节点ID
   * @returns {Promise<Array>} 分支列表
   */
  static async getOutgoingBranches(sourceNodeId) {
    const connection = await pool.getConnection();
    try {
      const [branches] = await connection.execute(
        'SELECT * FROM branches WHERE source_node_id = ? ORDER BY created_at ASC',
        [sourceNodeId]
      );
      return branches;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 获取节点的所有入向分支
   * @param {String} targetNodeId - 目标节点ID
   * @returns {Promise<Array>} 分支列表
   */
  static async getIncomingBranches(targetNodeId) {
    const connection = await pool.getConnection();
    try {
      const [branches] = await connection.execute(
        'SELECT * FROM branches WHERE target_node_id = ? ORDER BY created_at ASC',
        [targetNodeId]
      );
      return branches;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 获取两个节点之间的分支
   * @param {String} sourceNodeId - 源节点ID
   * @param {String} targetNodeId - 目标节点ID
   * @returns {Promise<Object|null>} 分支对象或null
   */
  static async getBranchBetween(sourceNodeId, targetNodeId) {
    const connection = await pool.getConnection();
    try {
      const [branches] = await connection.execute(
        'SELECT * FROM branches WHERE source_node_id = ? AND target_node_id = ?',
        [sourceNodeId, targetNodeId]
      );
      return branches[0] || null;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 获取故事的所有分支
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Array>} 分支列表
   */
  static async getStoryBranches(storyId) {
    const connection = await pool.getConnection();
    try {
      const [branches] = await connection.execute(
        `SELECT b.* FROM branches b
         INNER JOIN story_nodes sn1 ON b.source_node_id = sn1.id
         INNER JOIN story_nodes sn2 ON b.target_node_id = sn2.id
         WHERE sn1.story_id = ? OR sn2.story_id = ?
         ORDER BY b.created_at ASC`,
        [storyId, storyId]
      );
      return branches;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 批量创建分支
   * @param {Array} branchesData - 分支数据数组
   * @returns {Promise<Object>} 处理结果
   */
  static async createBranches(branchesData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = {
        created: [],
        errors: []
      };
      
      for (const branchData of branchesData) {
        try {
          const { source_node_id, target_node_id, context } = branchData;
          
          if (!source_node_id || !target_node_id) {
            throw new Error('源节点ID和目标节点ID必填');
          }
          
          // 检查是否已存在相同的连接
          const [existing] = await connection.execute(
            'SELECT id FROM branches WHERE source_node_id = ? AND target_node_id = ?',
            [source_node_id, target_node_id]
          );
          
          if (existing.length > 0) {
            throw new Error(`已存在从 ${source_node_id} 到 ${target_node_id} 的连接`);
          }
          
          const branch = await this.createBranch(
            source_node_id,
            target_node_id,
            context || '连接'
          );
          results.created.push(branch);
        } catch (error) {
          results.errors.push({
            branchData,
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
   * 删除分支
   * @param {String} id - 分支ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM branches WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 删除与节点相关的所有分支
   * @param {String} nodeId - 节点ID
   * @returns {Promise<Number>} 删除的分支数量
   */
  static async deleteNodeBranches(nodeId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM branches WHERE source_node_id = ? OR target_node_id = ?',
        [nodeId, nodeId]
      );
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 删除故事的所有分支
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Number>} 删除的分支数量
   */
  static async deleteStoryBranches(storyId) {
    const connection = await pool.getConnection();
    try {
      // 获取该故事的所有节点ID
      const [nodes] = await connection.execute(
        'SELECT id FROM story_nodes WHERE story_id = ?',
        [storyId]
      );
      
      if (nodes.length === 0) {
        return 0;
      }
      
      const nodeIds = nodes.map(node => node.id);
      const placeholders = nodeIds.map(() => '?').join(',');
      
      const [result] = await connection.execute(
        `DELETE FROM branches WHERE source_node_id IN (${placeholders}) OR target_node_id IN (${placeholders})`,
        [...nodeIds, ...nodeIds]
      );
      
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }
}

module.exports = Branch;
