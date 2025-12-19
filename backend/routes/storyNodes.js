const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const StoryNode = require('../models/StoryNode');
const Story = require('../models/Story');
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');



// 公共路由（不需要认证）- 放在最前面
// 获取故事的所有节点（公共端点，不需要认证）
router.get('/public/stories/:storyId/nodes', async (req, res) => {
  console.log('=== PUBLIC STORY NODES ROUTE HIT ===');
  console.log('Story ID:', req.params.storyId);
  try {
    const { storyId } = req.params;
    const { type, depth } = req.query;
    
    const query = { storyId };
    if (type) query.type = type;
    if (depth) query.depth = parseInt(depth);
    
    const nodes = await StoryNode.find(query)
      .sort({ depth: 1, order: 1 })
      .populate('parentId', 'title')
      .populate('choices.targetNodeId', 'title');
    
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
    
    const tree = await StoryNode.getStoryTree(storyId);
    if (!tree) {
      return res.status(404).json({
        success: false,
        message: '故事不存在或没有节点'
      });
    }
    
    res.json({
      success: true,
      data: tree
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
    const { type, depth } = req.query;
    
    const query = { storyId };
    if (type) query.type = type;
    if (depth) query.depth = parseInt(depth);
    
    const nodes = await StoryNode.find(query)
      .sort({ depth: 1, order: 1 })
      .populate('parentId', 'title')
      .populate('choices.targetNodeId', 'title');
    
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
    
    // 检查故事是否存在
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: '故事不存在'
      });
    }
    
    // 检查是否已有根节点 - 允许重复调用，返回已存在的根节点
    const existingRoot = await StoryNode.findOne({ storyId, parentId: null });
    if (existingRoot) {
      return res.status(200).json({
        success: true,
        message: '故事已有根节点，返回现有根节点',
        data: existingRoot
      });
    }
    
    // 创建根节点
    const rootNode = new StoryNode({
      storyId,
      parentId: null,
      title: title || '故事开始',
      content: content || '这是故事的开始...',
      type: 'normal',
      order: 0,
      depth: 0,
      path: ''
    });
    
    await rootNode.save();
    
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
    
    // 准备节点数据
    const nodeData = {
      title: title.trim(),
      content: content.trim(),
      type: type || 'normal'
    };
    
    // 如果是choice类型节点，添加description字段
    if (type === 'choice' && description) {
      nodeData.description = description;
    }
    
    // 如果提供了位置信息
    if (position) {
      nodeData.position = position;
    }
    
    // 如果提供了choices数组，在创建时就包含
    if (choices && Array.isArray(choices)) {
      console.log('📝 设置choices数组:', choices);
      nodeData.choices = choices.map(choice => ({
        id: choice.id || new mongoose.Types.ObjectId().toString(),
        text: choice.text.trim(),
        description: choice.description,
        targetNodeId: choice.targetNodeId || null
      }));
    }
    
    console.log('📝 创建节点数据:', JSON.stringify(nodeData, null, 2));
    
    let newNode;
    
    // 如果有parentId，使用createChild方法创建子节点
    if (parentId) {
      // 验证parentId格式
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({
          success: false,
          message: '无效的父节点ID格式'
        });
      }
      newNode = await StoryNode.createChild(parentId, nodeData);
    } else {
      // 如果没有parentId，直接创建节点（可能是根节点或独立节点）
      // 检查是否已有根节点
      const existingRoot = await StoryNode.findOne({ storyId, parentId: null });
      if (existingRoot) {
        // 如果已有根节点，将新节点作为根节点的子节点
        newNode = await StoryNode.createChild(existingRoot._id, nodeData);
      } else {
        // 创建根节点
        newNode = new StoryNode({
          ...nodeData,
          storyId,
          parentId: null,
          order: 0,
          depth: 0,
          path: '',
          position: position || { x: 400, y: 50 }
        });
        await newNode.save();
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
    if (!mongoose.Types.ObjectId.isValid(nodeId)) {
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
        if (choice.targetNodeId && !mongoose.Types.ObjectId.isValid(choice.targetNodeId)) {
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
    const story = await Story.findById(node.storyId);
    if (!story || story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限修改此节点'
      });
    }
    
    // 更新基本信息
    if (title) node.title = title.trim();
    if (content) node.content = content.trim();
    if (type) node.type = type;
    if (position) {
      node.position.x = position.x || node.position.x;
      node.position.y = position.y || node.position.y;
    }
    
    // 如果是choice类型节点，更新description字段
    if (type === 'choice' && description !== undefined) {
      node.description = description;
    }
    
    // 更新选项
    if (choices) {
      node.choices = choices;
    }
    
    await node.save();
    
    res.json({
      success: true,
      message: '节点更新成功',
      data: node
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
    const story = await Story.findById(node.storyId);
    if (!story || story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限移动此节点'
      });
    }
    
    // 检查新父节点
    if (newParentId) {
      const newParent = await StoryNode.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: '新父节点不存在'
        });
      }
      
      // 检查新父节点所属的故事
      const newParentStory = await Story.findById(newParent.storyId);
      if (!newParentStory || newParentStory.author.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权限将节点移动到目标父节点'
        });
      }
      
      // 检查循环引用
      if (await newParent.isAncestorOf(nodeId)) {
        return res.status(400).json({
          success: false,
          message: '不能移动到自己的子节点下'
        });
      }
      
      node.parentId = newParentId;
      node.storyId = newParent.storyId;
    }
    
    // 更新顺序
    if (newOrder !== undefined) {
      node.order = newOrder;
    }
    
    // 重新计算路径和深度
    if (node.parentId) {
      const parent = await StoryNode.findById(node.parentId);
      node.depth = parent.depth + 1;
      node.path = parent.path ? `${parent.path},${parent._id}` : parent._id.toString();
    } else {
      node.depth = 0;
      node.path = '';
    }
    
    await node.save();
    
    // 重新计算所有子节点的路径和深度
    await StoryNode.recalculatePaths(node.storyId);
    
    res.json({
      success: true,
      message: '节点移动成功',
      data: node
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
    
    const node = await StoryNode.findById(nodeId)
      .populate('parentId', 'title')
      .populate('choices.targetNodeId', 'title');
    
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
    const choice = node.choices.id(choiceId);
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
      
      // 检查循环引用
      if (await targetNode.isAncestorOf(nodeId)) {
        return res.status(400).json({
          success: false,
          message: '不能绑定到自己的子节点'
        });
      }
    }
    
    choice.targetNodeId = targetNodeId;
    await node.save();
    
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
      id: new mongoose.Types.ObjectId().toString(),
      text: text.trim(),
      description: description || '',
      targetNodeId: targetNodeId || null,
      autoCreate: autoCreate || false
    };
    
    // 添加到选项数组
    node.choices.push(newChoice);
    await node.save();
    
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
    const choice = node.choices.id(choiceId);
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
        if (await targetNode.isAncestorOf(nodeId)) {
          return res.status(400).json({
            success: false,
            message: '不能绑定到自己的子节点'
          });
        }
      }
      choice.targetNodeId = targetNodeId;
    }
    
    if (autoCreate !== undefined) {
      choice.autoCreate = autoCreate;
    }
    
    await node.save();
    
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
    
    // 查找选项索引
    const choiceIndex = node.choices.findIndex(choice => choice.id === choiceId);
    if (choiceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }
    
    // 删除选项
    node.choices.splice(choiceIndex, 1);
    await node.save();
    
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
      if (!mongoose.Types.ObjectId.isValid(newParentId)) {
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
    
    // 搜索节点
    const nodes = await StoryNode.searchNodes(storyId, keyword, options);
    
    res.json({
      success: true,
      message: '搜索节点成功',
      data: {
        nodes: nodes.map((node) => ({
          id: node.id,
          parentId: node.parentId,
          title: node.title,
          content: node.content,
          type: node.type,
          description: node.description,
          choices: node.choices,
          position: node.position,
          depth: node.depth,
          path: node.path,
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
    
    const nodes = await StoryNode.find({ storyId });
    const issues = [];
    
    // 检查每个节点的选项
    for (const node of nodes) {
      if (node.choices && node.choices.length > 0) {
        for (const choice of node.choices) {
          if (choice.targetNodeId) {
            const targetNode = await StoryNode.findById(choice.targetNodeId);
            if (!targetNode) {
              issues.push({
                type: 'missing_target',
                nodeId: node._id,
                nodeTitle: node.title,
                choiceId: choice.id,
                choiceText: choice.text,
                targetNodeId: choice.targetNodeId,
                message: `选项"${choice.text}"指向的目标节点不存在`
              });
            }
          }
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