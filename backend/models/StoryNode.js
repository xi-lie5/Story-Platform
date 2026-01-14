const { pool } = require('../config/database');
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
        storyId,
        story_id,
        title,
        content,
        is_root = false,
        type = 'regular',
        x = 0,
        y = 0
      } = nodeData;
      
      const storyIdValue = storyId || story_id;
      
      // 验证必填字段
      if (!storyIdValue || !title || !content) {
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
          [storyIdValue]
        );
        if (existing.length > 0) {
          throw new Error('该故事已存在根节点');
        }
      }
      
      // 验证故事是否存在
      const [stories] = await connection.execute(
        'SELECT id FROM stories WHERE id = ?',
        [storyIdValue]
      );
      if (stories.length === 0) {
        throw new Error('故事不存在');
      }
      
      const nodeId = uuidv4();
      
      await connection.execute(
        `INSERT INTO story_nodes (id, story_id, title, content, is_root, type, x, y) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nodeId, storyIdValue, title.trim(), content.trim(), is_root, type, x, y]
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
              storyId
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
      
      if (query.storyId || query.story_id) {
        sql += ' AND story_id = ?';
        params.push(query.storyId || query.story_id);
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

  /**
   * 处理节点关系（批量保存节点和分支）
   * @param {Array} nodes - 节点数据数组，每个节点包含branches数组
   * @param {Number} storyId - 故事ID
   * @returns {Promise<Object>} 处理结果
   */
  static async processNodeRelations(nodes, storyId) {
    const connection = await pool.getConnection();
    const Branch = require('./Branch');
    const { v4: uuidv4 } = require('uuid');
    
    try {
      // 确保storyId是整数类型
      const storyIdInt = parseInt(storyId);
      if (isNaN(storyIdInt)) {
        throw new Error(`无效的故事ID: ${storyId}`);
      }
      
      await connection.beginTransaction();
      
      // 第零步：先删除故事的所有旧节点和分支（由于外键约束，删除节点会自动删除分支）
      console.log(`开始保存故事 ${storyIdInt} 的节点和分支，先删除旧数据...`);
      const [existingNodes] = await connection.execute(
        'SELECT id FROM story_nodes WHERE story_id = ?',
        [storyIdInt]
      );
      
      if (existingNodes.length > 0) {
        const nodeIds = existingNodes.map(n => n.id);
        const placeholders = nodeIds.map(() => '?').join(',');
        
        // 先删除分支（虽然外键会自动删除，但显式删除更清晰）
        await connection.execute(
          `DELETE FROM branches WHERE source_node_id IN (${placeholders}) OR target_node_id IN (${placeholders})`,
          [...nodeIds, ...nodeIds]
        );
        
        // 再删除节点
        await connection.execute(
          `DELETE FROM story_nodes WHERE story_id = ?`,
          [storyIdInt]
        );
        
        console.log(`已删除 ${existingNodes.length} 个旧节点及其分支`);
      }
      
      // 节点ID映射：前端临时ID -> 数据库ID
      const nodeIdMap = new Map();
      const savedNodes = [];
      
      // 第一步：先保存所有节点
      console.log(`开始保存 ${nodes.length} 个节点...`);
      for (const nodeData of nodes) {
        try {
          // 确保位置信息是数字类型，且不为 undefined 或 null
          const nodeX = (typeof nodeData.x === 'number' && !isNaN(nodeData.x)) ? nodeData.x : 0;
          const nodeY = (typeof nodeData.y === 'number' && !isNaN(nodeData.y)) ? nodeData.y : 0;
          
          const nodeInfo = {
            storyId: storyIdInt,
            title: nodeData.title,
            content: nodeData.content,
            type: nodeData.type || 'regular',
            x: nodeX,
            y: nodeY,
            is_root: nodeData.isRoot || false
          };
          
          // 调试信息：记录节点位置
          console.log(`保存节点位置: 标题="${nodeInfo.title}", x=${nodeInfo.x}, y=${nodeInfo.y}`);
          
          // 直接在事务中创建节点
          const nodeId = uuidv4();
          await connection.execute(
            `INSERT INTO story_nodes (id, story_id, title, content, is_root, type, x, y) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              nodeId,
              storyIdInt,
              nodeInfo.title.trim(),
              nodeInfo.content.trim(),
              nodeInfo.is_root,
              nodeInfo.type,
              nodeInfo.x,
              nodeInfo.y
            ]
          );
          
          const [savedNodeRows] = await connection.execute(
            'SELECT * FROM story_nodes WHERE id = ?',
            [nodeId]
          );
          const savedNode = savedNodeRows[0];
          
          // 保存ID映射：前端临时ID -> 数据库ID
          nodeIdMap.set(nodeData.id, savedNode.id);
          savedNodes.push(savedNode);
          
          console.log(`节点保存成功: 前端ID=${nodeData.id} -> 数据库ID=${savedNode.id}, 标题="${nodeInfo.title}"`);
        } catch (error) {
          console.error(`保存节点失败 ${nodeData.id}:`, error.message);
          throw error;
        }
      }
      
      // 第二步：保存所有分支
      console.log(`开始保存分支...`);
      let branchesCreated = 0;
      let branchesSkipped = 0;
      
      for (const nodeData of nodes) {
        const sourceNodeId = nodeIdMap.get(nodeData.id);
        if (!sourceNodeId) {
          console.warn(`跳过节点 ${nodeData.id} 的分支：源节点ID映射不存在`);
          continue;
        }
        
        if (nodeData.branches && Array.isArray(nodeData.branches)) {
          console.log(`节点 ${nodeData.id} (${nodeData.title}) 有 ${nodeData.branches.length} 个分支`);
          
          for (const branch of nodeData.branches) {
            // 支持多种字段名：targetId 或 targetNodeId
            const targetId = branch.targetId || branch.targetNodeId;
            
            if (!targetId) {
              console.warn(`分支缺少目标节点ID:`, branch);
              branchesSkipped++;
              continue;
            }
            
            const targetNodeId = nodeIdMap.get(targetId);
            if (!targetNodeId) {
              console.warn(`分支目标节点ID映射不存在: 前端ID=${targetId}, 分支文本="${branch.text}"`);
              branchesSkipped++;
              continue;
            }
            
            if (!branch.text || branch.text.trim() === '') {
              console.warn(`分支文本为空，跳过: 源节点=${sourceNodeId}, 目标节点=${targetNodeId}`);
              branchesSkipped++;
              continue;
            }
            
              try {
              // 检查是否已存在相同的连接（虽然已经删除了旧数据，但为了安全还是检查一下）
                const [existing] = await connection.execute(
                  'SELECT id FROM branches WHERE source_node_id = ? AND target_node_id = ?',
                  [sourceNodeId, targetNodeId]
                );
                
                if (existing.length === 0) {
                  const branchId = uuidv4();
                // 验证UUID格式
                if (typeof branchId !== 'string' || branchId.length !== 36) {
                  console.error(`无效的UUID格式: ${branchId}, 类型: ${typeof branchId}`);
                  throw new Error(`生成的UUID格式无效: ${branchId}`);
                }
                
                // 验证节点ID格式
                if (typeof sourceNodeId !== 'string' || sourceNodeId.length !== 36) {
                  console.error(`无效的源节点ID格式: ${sourceNodeId}, 类型: ${typeof sourceNodeId}`);
                }
                if (typeof targetNodeId !== 'string' || targetNodeId.length !== 36) {
                  console.error(`无效的目标节点ID格式: ${targetNodeId}, 类型: ${typeof targetNodeId}`);
                }
                
                console.log(`准备插入分支: id=${branchId}, source=${sourceNodeId}, target=${targetNodeId}`);
                
                  await connection.execute(
                    `INSERT INTO branches (id, source_node_id, target_node_id, context) 
                     VALUES (?, ?, ?, ?)`,
                    [branchId, sourceNodeId, targetNodeId, branch.text.trim()]
                  );
                
                // 验证插入的数据
                const [verifyRows] = await connection.execute(
                  'SELECT id, source_node_id, target_node_id FROM branches WHERE id = ?',
                  [branchId]
                );
                if (verifyRows.length > 0) {
                  const saved = verifyRows[0];
                  console.log(`分支保存验证: id=${saved.id}, source=${saved.source_node_id}, target=${saved.target_node_id}`);
                  
                  // 检查是否有乱码
                  if (saved.id !== branchId || saved.source_node_id !== sourceNodeId || saved.target_node_id !== targetNodeId) {
                    console.error(`⚠️ 警告：保存的分支数据与原始数据不匹配！`);
                    console.error(`原始: id=${branchId}, source=${sourceNodeId}, target=${targetNodeId}`);
                    console.error(`保存: id=${saved.id}, source=${saved.source_node_id}, target=${saved.target_node_id}`);
                  }
                }
                
                branchesCreated++;
                console.log(`分支创建成功: ${sourceNodeId} -> ${targetNodeId}, 文本="${branch.text}"`);
              } else {
                console.log(`分支已存在，跳过: ${sourceNodeId} -> ${targetNodeId}`);
                branchesSkipped++;
              }
            } catch (error) {
              console.error(`创建分支失败 (${sourceNodeId} -> ${targetNodeId}):`, error.message);
              branchesSkipped++;
              }
            }
        } else {
          console.log(`节点 ${nodeData.id} (${nodeData.title}) 没有分支`);
        }
      }
      
      await connection.commit();
      console.log(`批量保存完成: ${savedNodes.length} 个节点, ${branchesCreated} 个分支创建成功, ${branchesSkipped} 个分支跳过`);
      
      return {
        nodes: savedNodes,
        nodeIdMap: Object.fromEntries(nodeIdMap),
        branchesCreated: branchesCreated,
        branchesSkipped: branchesSkipped
      };
    } catch (error) {
      await connection.rollback();
      console.error('批量保存节点和分支失败，已回滚:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = StoryNode;
