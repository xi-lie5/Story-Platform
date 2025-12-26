const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const StoryNode = require('../models/StoryNode');
const Story = require('../models/Story');
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');
const { isValidIntegerId, isValidStringId } = require('../utils/idValidator');



// 公共路由（不需要认证）- 放在最前面
// 获取故事的所有节点（公共端点，不需要认证）
router.get('/public/stories/:storyId/nodes', async (req, res) => {
  console.log('=== PUBLIC STORY NODES ROUTE HIT ===');
  console.log('Story ID:', req.params.storyId);
  try {
    const { storyId } = req.params;
    const { type, depth } = req.query;
    
    const queryOptions = {};
    if (type) queryOptions.type = type;
    
    const nodes = await StoryNode.getStoryNodes(storyId, queryOptions);
    
    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    console.error('获取节点列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取节点列表失败',
      error: error.message
    });
  }
});

// 获取故事树
router.get('/stories/:storyId/tree', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    // 获取所有节点和分支，然后构建树结构
    const nodes = await StoryNode.getStoryNodes(parseInt(storyId));
    const Branch = require('../models/Branch');
    const branches = await Branch.getStoryBranches(parseInt(storyId));
    
    if (!nodes || nodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '故事不存在或没有节点'
      });
    }
    
    // 构建树结构
    const rootNode = nodes.find(n => n.is_root);
    if (!rootNode) {
      return res.status(404).json({
        success: false,
        message: '故事没有根节点'
      });
    }
    
    res.json({
      success: true,
      data: {
        root: rootNode,
        nodes: nodes,
        branches: branches
      }
    });
  } catch (error) {
    console.error('获取故事树失败:', error);
    res.status(500).json({
      success: false,
      message: '获取故事树失败',
      error: error.message
    });
  }
});

// 获取故事的所有节点（平铺结构，用于编辑器）
router.get('/stories/:storyId/nodes', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { type } = req.query;
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    const queryOptions = {};
    if (type) queryOptions.type = type;
    
    const nodes = await StoryNode.getStoryNodes(parseInt(storyId), queryOptions);
    
    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    console.error('获取节点列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取节点列表失败',
      error: error.message
    });
  }
});

// 创建根节点（新故事）
router.post('/stories/:storyId/root', authGuard, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { title, content } = req.body;
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    // 检查故事是否存在
    const story = await Story.findById(parseInt(storyId));
    if (!story) {
      return res.status(404).json({
        success: false,
        message: '故事不存在'
      });
    }
    
    // 检查是否已有根节点 - 允许重复调用，返回已存在的根节点
    const existingRoot = await StoryNode.getRootNode(parseInt(storyId));
    if (existingRoot) {
      return res.status(200).json({
        success: true,
        message: '故事已有根节点，返回现有根节点',
        data: existingRoot
      });
    }
    
    // 创建根节点
    const rootNode = await StoryNode.create({
      story_id: storyId,
      storyId: storyId,
      title: title || '故事开始',
      content: content || '这是故事的开始...',
      type: 'regular',
      is_root: true,
      x: 400,
      y: 50
    });
    
    res.status(201).json({
      success: true,
      message: '根节点创建成功',
      data: rootNode
    });
  } catch (error) {
    console.error('创建根节点失败:', error);
    res.status(500).json({
      success: false,
      message: '创建根节点失败',
      error: error.message
    });
  }
});

// 创建子节点
router.post('/stories/:storyId/nodes', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    let { parentId, title, content, type, description, choices, position } = req.body;
    
    // 验证输入
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '节点标题不能为空'
      });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '节点内容不能为空'
      });
    }
    
    // 验证type的有效值
    const validTypes = ['normal', 'choice', 'ending'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的节点类型，允许的值：normal, choice, ending'
      });
    }
    
    // 验证choices数组
    if (choices && !Array.isArray(choices)) {
      return res.status(400).json({
        success: false,
        message: 'choices必须是数组'
      });
    }
    
    // 验证每个choice
    if (choices && choices.length > 0) {
      for (const choice of choices) {
        if (!choice.text || choice.text.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: '选项文本不能为空'
          });
        }
      }
    }
    
    // 验证position格式
    if (position && (typeof position.x !== 'number' || typeof position.y !== 'number')) {
      return res.status(400).json({
        success: false,
        message: 'position必须包含有效的x和y数值'
      });
    }
    
    console.log('🔍 收到的请求数据:', JSON.stringify(req.body, null, 2));
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    // 准备节点数据
    const nodeData = {
      story_id: parseInt(storyId),
      storyId: parseInt(storyId),
      title: title.trim(),
      content: content.trim(),
      type: mappedType,
      is_root: false,
      x: position ? position.x : 0,
      y: position ? position.y : 0
    };
    
    console.log('📝 创建节点数据:', JSON.stringify(nodeData, null, 2));
    
    let newNode;
    
    // 如果有parentId，验证父节点存在
    if (parentId) {
      // 验证parentId格式
      if (!isValidStringId(parentId)) {
        return res.status(400).json({
          success: false,
          message: '无效的父节点ID格式'
        });
      }
      // 验证父节点是否存在且属于同一个故事
      const parentNode = await StoryNode.findById(parentId);
      if (!parentNode || parentNode.story_id !== parseInt(storyId)) {
        return res.status(400).json({
          success: false,
          message: '父节点不存在或不属于该故事'
        });
      }
      // 创建子节点
      newNode = await StoryNode.create(nodeData);
    } else {
      // 如果没有parentId，检查是否已有根节点
      const existingRoot = await StoryNode.getRootNode(parseInt(storyId));
      if (existingRoot) {
        // 如果已有根节点，创建普通子节点
        newNode = await StoryNode.create(nodeData);
      } else {
        // 创建根节点
        nodeData.is_root = true;
        nodeData.x = position ? position.x : 400;
        nodeData.y = position ? position.y : 50;
        newNode = await StoryNode.create(nodeData);
      }
    }
    
    // 如果提供了choices数组，创建对应的分支
    if (choices && Array.isArray(choices) && choices.length > 0) {
      const Branch = require('../models/Branch');
      for (const choice of choices) {
        if (choice.targetNodeId && isValidStringId(choice.targetNodeId)) {
          try {
            await Branch.createBranch(
              newNode.id,
              choice.targetNodeId,
              choice.text || choice.description || '连接'
            );
          } catch (error) {
            console.warn('创建分支失败:', error.message);
          }
        }
      }
    }
    
    res.status(201).json({
      success: true,
      message: '节点创建成功',
      data: newNode
    });
  } catch (error) {
    console.error('创建节点失败:', error);
    res.status(500).json({
      success: false,
      message: '创建节点失败',
      error: error.message
    });
  }
});

// 批量保存节点（处理自动创建分支和关系绑定）
router.post('/stories/:storyId/nodes/batch', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { nodes } = req.body;
    
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        message: '节点数据格式错误'
      });
    }
    
    // 使用新的批量处理方法
    const savedNodes = await StoryNode.processNodeRelations(nodes, storyId);
    
    res.status(201).json({
      success: true,
      message: '节点批量保存成功',
      data: savedNodes
    });
  } catch (error) {
    console.error('批量保存节点失败:', error);
    res.status(500).json({
      success: false,
      message: '批量保存节点失败',
      error: error.message
    });
  }
});

// 更新节点
router.put('/nodes/:nodeId', authGuard, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { title, content, type, description, choices, position } = req.body;
    
    // 验证nodeId格式
    if (!isValidStringId(nodeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的节点ID格式'
      });
    }
    
    // 验证输入数据
    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: '节点标题不能为空且必须是字符串'
      });
    }
    
    if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: '节点内容不能为空且必须是字符串'
      });
    }
    
    // 验证type的有效值
    const validTypes = ['normal', 'choice', 'ending'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的节点类型，允许的值：normal, choice, ending'
      });
    }
    
    // 验证choices数组
    if (choices && !Array.isArray(choices)) {
      return res.status(400).json({
        success: false,
        message: 'choices必须是数组'
      });
    }
    
    // 验证每个choice
    if (choices && choices.length > 0) {
      for (const choice of choices) {
        if (!choice.text || choice.text.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: '选项文本不能为空'
          });
        }
        if (choice.targetNodeId && !isValidStringId(choice.targetNodeId)) {
          return res.status(400).json({
            success: false,
            message: '无效的目标节点ID格式'
          });
        }
      }
    }
    
    // 验证position格式
    if (position && (typeof position.x !== 'number' || typeof position.y !== 'number')) {
      return res.status(400).json({
        success: false,
        message: 'position必须包含有效的x和y数值'
      });
    }
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 检查权限：获取节点所属的故事，然后检查用户是否是故事作者
    const story = await Story.findById(node.story_id);
    if (!story || story.author_id !== parseInt(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '无权限修改此节点'
      });
    }
    
    // 构建更新数据
    const updateData = {};
    
    if (title) updateData.title = title.trim();
    if (content) updateData.content = content.trim();
    if (type) {
      const typeMap = {
        'normal': 'regular',
        'choice': 'branch',
        'ending': 'end'
      };
      updateData.type = typeMap[type] || type;
    }
    
    // 更新节点位置
    if (position) {
      updateData.x = position.x !== undefined ? position.x : (node.x || 0);
      updateData.y = position.y !== undefined ? position.y : (node.y || 0);
    }
    
    // 更新节点
    const updatedNode = await StoryNode.findByIdAndUpdate(nodeId, updateData);
    
    // 如果提供了choices数组，更新对应的分支
    if (choices && Array.isArray(choices)) {
      const Branch = require('../models/Branch');
      // 删除该节点的所有出向分支
      await Branch.deleteNodeBranches(nodeId);
      // 重新创建分支
      for (const choice of choices) {
        if (choice.targetNodeId && isValidStringId(choice.targetNodeId)) {
          try {
            await Branch.createBranch(
              nodeId,
              choice.targetNodeId,
              choice.text || choice.description || '连接'
            );
          } catch (error) {
            console.warn('创建分支失败:', error.message);
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: '节点更新成功',
      data: updatedNode
    });
  } catch (error) {
    console.error('更新节点失败:', error);
    res.status(500).json({
      success: false,
      message: '更新节点失败',
      error: error.message
    });
  }
});

// 删除节点及其子树
router.delete('/nodes/:nodeId', authGuard, async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    // 检查权限
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    const story = await Story.findById(node.storyId);
    if (!story || story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限删除此节点'
      });
    }
    
    await StoryNode.deleteSubtree(nodeId);
    
    res.json({
      success: true,
      message: '节点及其子节点删除成功'
    });
  } catch (error) {
    console.error('删除节点失败:', error);
    res.status(500).json({
      success: false,
      message: '删除节点失败',
      error: error.message
    });
  }
});

// 移动节点（改变父节点或顺序）
router.put('/nodes/:nodeId/move', authGuard, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { newParentId, newOrder } = req.body;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 检查权限
    const story = await Story.findById(node.story_id);
    if (!story || story.author_id !== parseInt(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '无权限移动此节点'
      });
    }
    
    // 更新节点位置（MySQL版本简化处理，只更新坐标）
    const updateData = {};
    
    if (newParentId) {
      const newParent = await StoryNode.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: '新父节点不存在'
        });
      }
      
      // 检查新父节点所属的故事
      const newParentStory = await Story.findById(newParent.story_id);
      if (!newParentStory || newParentStory.author_id !== parseInt(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: '无权限将节点移动到目标父节点'
        });
      }
      
      // 检查是否尝试移动到自己的子节点（简单检查）
      const Branch = require('../models/Branch');
      const outgoingBranches = await Branch.getOutgoingBranches(nodeId);
      const targetNodeIds = outgoingBranches.map(b => b.target_node_id);
      if (targetNodeIds.includes(newParentId)) {
        return res.status(400).json({
          success: false,
          message: '不能移动到自己的子节点下'
        });
      }
    }
    
    // 更新节点（MySQL版本中，节点位置通过x, y坐标管理，不通过parentId）
    // 如果需要，可以通过分支关系来管理节点之间的连接
    const updatedNode = await StoryNode.findByIdAndUpdate(nodeId, updateData);
    
    res.json({
      success: true,
      message: '节点移动成功',
      data: updatedNode
    });
  } catch (error) {
    console.error('移动节点失败:', error);
    res.status(500).json({
      success: false,
      message: '移动节点失败',
      error: error.message
    });
  }
});

// 获取单个节点（添加权限检查）
router.get('/nodes/:nodeId', authGuard, async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    const node = await StoryNode.findById(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 检查权限：如果节点所属的故事是公开的，可以直接访问；否则需要是故事作者
    const story = await Story.findById(node.storyId);
    if (!story || (!story.isPublic && story.author.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此节点'
      });
    }
    
    res.json({
      success: true,
      data: node
    });
  } catch (error) {
    console.error('获取节点失败:', error);
    res.status(500).json({
      success: false,
      message: '获取节点失败',
      error: error.message
    });
  }
});

// 绑定选项到目标节点
router.put('/nodes/:nodeId/choices/:choiceId/bind', authGuard, async (req, res) => {
  try {
    const { nodeId, choiceId } = req.params;
    const { targetNodeId } = req.body;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 查找并更新选项
    // MySQL版本中，choices通过branches表管理
    // 查找对应的分支
    const Branch = require('../models/Branch');
    const branches = await Branch.getOutgoingBranches(nodeId);
    const branch = branches.find(b => b.id === choiceId);
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }
    
    const choice = { id: branch.id, targetNodeId: branch.target_node_id, context: branch.context };
    if (!choice) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }
    
    // 验证目标节点
    if (targetNodeId) {
      const targetNode = await StoryNode.findById(targetNodeId);
      if (!targetNode) {
        return res.status(404).json({
          success: false,
          message: '目标节点不存在'
        });
      }
      
      // 检查循环引用（简单检查：不能绑定到自己）
      if (targetNodeId === nodeId) {
        return res.status(400).json({
          success: false,
          message: '不能绑定到自己'
        });
      }
      
      // 检查是否形成循环（通过检查目标节点的出向分支）
      const Branch = require('../models/Branch');
      const targetBranches = await Branch.getOutgoingBranches(targetNodeId);
      const targetNodeIds = targetBranches.map(b => b.target_node_id);
      if (targetNodeIds.includes(nodeId)) {
        return res.status(400).json({
          success: false,
          message: '不能绑定到自己的子节点（会形成循环）'
        });
      }
    }
    
    // 更新分支的目标节点
    if (targetNodeId && isValidStringId(targetNodeId)) {
      // 删除旧分支，创建新分支
      await Branch.findByIdAndDelete(branch.id);
      await Branch.createBranch(nodeId, targetNodeId, choice.context || branch.context);
    }
    
    res.json({
      success: true,
      message: '选项绑定成功',
      data: choice
    });
  } catch (error) {
    console.error('绑定选项失败:', error);
    res.status(500).json({
      success: false,
      message: '绑定选项失败',
      error: error.message
    });
  }
});

// 添加选项到节点
router.post('/nodes/:nodeId/choices', authGuard, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { text, description, targetNodeId, autoCreate } = req.body;
    
    // 验证输入
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '选项文本不能为空'
      });
    }
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 创建新选项
    const newChoice = {
      id: uuidv4(),
      text: text.trim(),
      description: description || '',
      targetNodeId: targetNodeId || null,
      autoCreate: autoCreate || false
    };
    
    // 如果提供了targetNodeId，创建分支
    if (newChoice.targetNodeId && isValidStringId(newChoice.targetNodeId)) {
      const Branch = require('../models/Branch');
      try {
        await Branch.createBranch(
          nodeId,
          newChoice.targetNodeId,
          newChoice.text || newChoice.description || '连接'
        );
      } catch (error) {
        console.warn('创建分支失败:', error.message);
      }
    }
    
    res.status(201).json({
      success: true,
      message: '选项添加成功',
      data: newChoice
    });
  } catch (error) {
    console.error('添加选项失败:', error);
    res.status(500).json({
      success: false,
      message: '添加选项失败',
      error: error.message
    });
  }
});

// 更新节点的选项
router.put('/nodes/:nodeId/choices/:choiceId', authGuard, async (req, res) => {
  try {
    const { nodeId, choiceId } = req.params;
    const { text, description, targetNodeId, autoCreate } = req.body;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 查找选项
    // MySQL版本中，choices通过branches表管理
    // 查找对应的分支
    const Branch = require('../models/Branch');
    const branches = await Branch.getOutgoingBranches(nodeId);
    const branch = branches.find(b => b.id === choiceId);
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }
    
    const choice = { id: branch.id, targetNodeId: branch.target_node_id, context: branch.context };
    if (!choice) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }
    
    // 更新选项
    if (text !== undefined) {
      if (text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '选项文本不能为空'
        });
      }
      choice.text = text.trim();
    }
    
    if (description !== undefined) {
      choice.description = description;
    }
    
    if (targetNodeId !== undefined) {
      if (targetNodeId) {
        const targetNode = await StoryNode.findById(targetNodeId);
        if (!targetNode) {
          return res.status(404).json({
            success: false,
            message: '目标节点不存在'
          });
        }
        
        // 检查循环引用
        // 检查循环引用（简单检查：不能绑定到自己）
        if (targetNodeId === nodeId) {
          return res.status(400).json({
            success: false,
            message: '不能绑定到自己'
          });
        }
        
        // 检查是否形成循环（通过检查目标节点的出向分支）
        const Branch = require('../models/Branch');
        const targetBranches = await Branch.getOutgoingBranches(targetNodeId);
        const targetNodeIds = targetBranches.map(b => b.target_node_id);
        if (targetNodeIds.includes(nodeId)) {
          return res.status(400).json({
            success: false,
            message: '不能绑定到自己的子节点（会形成循环）'
          });
        }
        
        // 如果检查通过，继续执行
        if (false) {
          return res.status(400).json({
            success: false,
            message: '不能绑定到自己的子节点'
          });
        }
      }
      // 更新分支的目标节点
      const Branch = require('../models/Branch');
      await Branch.findByIdAndDelete(branch.id);
      await Branch.createBranch(nodeId, targetNodeId, choice.context || branch.context);
    }
    
    res.json({
      success: true,
      message: '选项更新成功',
      data: choice
    });
  } catch (error) {
    console.error('更新选项失败:', error);
    res.status(500).json({
      success: false,
      message: '更新选项失败',
      error: error.message
    });
  }
});

// 删除节点的选项
router.delete('/nodes/:nodeId/choices/:choiceId', authGuard, async (req, res) => {
  try {
    const { nodeId, choiceId } = req.params;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // MySQL版本中，choices通过branches表管理
    // 查找对应的分支并删除
    const Branch = require('../models/Branch');
    const branch = await Branch.findById(choiceId);
    if (!branch || branch.source_node_id !== nodeId) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }
    
    // 删除分支
    await Branch.findByIdAndDelete(choiceId);
    
    res.json({
      success: true,
      message: '选项删除成功',
      data: {
        nodeId: nodeId,
        choiceId: choiceId
      }
    });
  } catch (error) {
    console.error('删除选项失败:', error);
    res.status(500).json({
      success: false,
      message: '删除选项失败',
      error: error.message
    });
  }
});

// 复制节点
router.post('/nodes/:nodeId/copy', authGuard, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { newParentId } = req.body;
    
    // 检查权限
    const originalNode = await StoryNode.findById(nodeId);
    if (!originalNode) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    const story = await Story.findById(originalNode.storyId);
    if (!story || story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限复制此节点'
      });
    }
    
    // 验证新父节点ID（如果提供）
    if (newParentId) {
      if (!isValidStringId(newParentId)) {
        return res.status(400).json({
          success: false,
          message: '无效的父节点ID格式'
        });
      }
      
      const parentNode = await StoryNode.findById(newParentId);
      if (!parentNode) {
        return res.status(404).json({
          success: false,
          message: '新父节点不存在'
        });
      }
      
      // 确保新父节点属于同一个故事
      if (parentNode.storyId.toString() !== originalNode.storyId.toString()) {
        return res.status(400).json({
          success: false,
          message: '新父节点必须属于同一个故事'
        });
      }
    }
    
    // 复制节点
    const copiedNode = await StoryNode.copyNode(nodeId, newParentId);
    
    res.status(201).json({
      success: true,
      message: '节点复制成功',
      data: copiedNode
    });
  } catch (error) {
    console.error('复制节点失败:', error);
    res.status(500).json({
      success: false,
      message: '复制节点失败',
      error: error.message
    });
  }
});

// 调整节点顺序
router.put('/stories/:storyId/nodes/reorder', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { nodeOrders } = req.body;
    
    // 验证输入
    if (!nodeOrders || !Array.isArray(nodeOrders)) {
      return res.status(400).json({
        success: false,
        message: 'nodeOrders参数必须是数组'
      });
    }
    
    // 调整节点顺序
    await StoryNode.reorderNodes(storyId, nodeOrders);
    
    res.json({
      success: true,
      message: '节点顺序调整成功'
    });
  } catch (error) {
    console.error('调整节点顺序失败:', error);
    res.status(500).json({
      success: false,
      message: '调整节点顺序失败',
      error: error.message
    });
  }
});

// 搜索节点
router.get('/stories/:storyId/nodes/search', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { keyword, limit, offset, searchInContent } = req.query;
    
    // 验证输入
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }
    
    // 准备搜索选项
    const options = {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
      searchInContent: searchInContent !== 'false' // 默认搜索内容
    };
    
    // 搜索节点（MySQL版本：使用简单查询）
    const allNodes = await StoryNode.getStoryNodes(storyId);
    const keywordLower = keyword.toLowerCase();
    const nodes = allNodes.filter(node => 
      node.title.toLowerCase().includes(keywordLower) ||
      (options.searchInContent && node.content.toLowerCase().includes(keywordLower))
    ).slice(options.offset, options.offset + options.limit);
    
    res.json({
      success: true,
      message: '搜索节点成功',
      data: {
        nodes: nodes.map((node) => ({
          id: node.id,
          story_id: node.story_id,
          title: node.title,
          content: node.content,
          type: node.type,
          is_root: node.is_root,
          x: node.x,
          y: node.y,
          order: node.order
        })),
        total: nodes.length,
        limit: options.limit,
        offset: options.offset
      }
    });
  } catch (error) {
    console.error('搜索节点失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索节点失败',
      error: error.message
    });
  }
});

// 验证故事的一致性
router.get('/stories/:storyId/validate', authGuard, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    const nodes = await StoryNode.getStoryNodes(parseInt(storyId));
    const issues = [];
    
    // 检查每个节点的分支
    const Branch = require('../models/Branch');
    for (const node of nodes) {
      const branches = await Branch.getOutgoingBranches(node.id);
      for (const branch of branches) {
        const targetNode = await StoryNode.findById(branch.target_node_id);
        if (!targetNode) {
          issues.push({
            type: 'missing_target',
            nodeId: node.id,
            nodeTitle: node.title,
            branchId: branch.id,
            branchContext: branch.context,
            targetNodeId: branch.target_node_id,
            message: `分支"${branch.context}"指向的目标节点不存在`
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        totalNodes: nodes.length,
        issues: issues,
        isValid: issues.length === 0
      }
    });
  } catch (error) {
    console.error('验证故事一致性失败:', error);
    res.status(500).json({
      success: false,
      message: '验证故事一致性失败',
      error: error.message
    });
  }
});

module.exports = router;