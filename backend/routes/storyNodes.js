const express = require('express');
const router = express.Router();
const StoryNode = require('../models/StoryNode');
const Story = require('../models/Story');
const auth = require('../middleware/auth');
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');

// 获取故事树
router.get('/stories/:storyId/tree', auth, storyAuth, async (req, res) => {
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
router.get('/stories/:storyId/nodes', auth, storyAuth, async (req, res) => {
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
router.post('/stories/:storyId/root', auth, async (req, res) => {
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
    
    // 检查是否已有根节点
    const existingRoot = await StoryNode.findOne({ storyId, parentId: null });
    if (existingRoot) {
      return res.status(400).json({
        success: false,
        message: '故事已有根节点'
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
router.post('/stories/:storyId/nodes', auth, storyAuth, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { parentId, title, content, type, choiceText, choices } = req.body;
    
    console.log('🔍 收到的请求数据:', JSON.stringify(req.body, null, 2));
    
    // 准备节点数据
    const nodeData = {
      title: title || '新章节',
      content: content || '请输入章节内容...',
      type: type || 'normal',
      choiceText: choiceText
    };
    
    // 如果是choice类型节点，并且提供了choices数组，在创建时就包含
    if (type === 'choice' && choices && Array.isArray(choices)) {
      console.log('📝 设置choices数组:', choices); // 调试日志
      nodeData.choices = choices.map(choice => ({
        id: choice.id || new mongoose.Types.ObjectId().toString(),
        text: choice.text,
        targetNodeId: choice.targetNodeId || null
      }));
    } else {
      console.log('📝 没有设置choices数组，type:', type, 'choices:', choices);
    }
    
    console.log('📝 创建节点数据:', JSON.stringify(nodeData, null, 2)); // 调试日志
    
    // 创建子节点
    const childNode = await StoryNode.createChild(parentId, nodeData);
    
    res.status(201).json({
      success: true,
      message: '子节点创建成功',
      data: childNode
    });
  } catch (error) {
    console.error('创建子节点失败:', error);
    res.status(500).json({
      success: false,
      message: '创建子节点失败',
      error: error.message
    });
  }
});

// 批量保存节点（处理自动创建分支和关系绑定）
router.post('/stories/:storyId/nodes/batch', auth, storyAuth, async (req, res) => {
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
router.put('/nodes/:nodeId', auth, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { title, content, type, choices, position } = req.body;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      });
    }
    
    // 更新基本信息
    if (title) node.title = title;
    if (content) node.content = content;
    if (type) node.type = type;
    if (position) {
      node.position.x = position.x || node.position.x;
      node.position.y = position.y || node.position.y;
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
router.delete('/nodes/:nodeId', auth, async (req, res) => {
  try {
    const { nodeId } = req.params;
    
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
router.put('/nodes/:nodeId/move', auth, async (req, res) => {
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
    
    // 检查新父节点
    if (newParentId) {
      const newParent = await StoryNode.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: '新父节点不存在'
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

// 绑定选项到目标节点
router.put('/nodes/:nodeId/choices/:choiceId/bind', auth, async (req, res) => {
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

// 验证故事的一致性
router.get('/stories/:storyId/validate', auth, storyAuth, async (req, res) => {
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