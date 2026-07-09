const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const StoryNode = require('../models/StoryNode');
const Story = require('../models/Story');
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');
const { isValidIntegerId, isValidStringId } = require('../utils/idValidator');
const { errorFormat } = require('../utils/errorFormat');



// 鍏叡璺敱锛堜笉闇€瑕佽璇侊級- 鏀惧湪鏈€鍓嶉潰
// 鑾峰彇鏁呬簨鐨勬墍鏈夎妭鐐癸紙鍏叡绔偣锛屼笉闇€瑕佽璇侊級
router.get('/public/stories/:storyId/nodes', async (req, res, next) => {
  console.log('=== PUBLIC STORY NODES ROUTE HIT ===');
  console.log('Story ID:', req.params.storyId);
  try {
    const { storyId } = req.params;
    const { type, depth } = req.query;
    
    // 验证storyId格式
    const storyIdInt = parseInt(storyId);
    if (isNaN(storyIdInt)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    // 检查故事是否存在
    const story = await Story.findById(storyIdInt);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 妫€鏌ヨ闂潈闄愶細
    // 1. 宸插彂甯冪殑鍏紑鏁呬簨锛氫换浣曚汉閮藉彲浠ヨ闂?    // 2. 寰呭鏍告垨宸叉嫆缁濈殑鏁呬簨锛氫綔鑰呭拰绠＄悊鍛樺彲浠ヨ闂紙鐢ㄤ簬棰勮鍜屽鏍革級
    // 3. 其他状态：拒绝访问
    let isAuthor = false;
    let isAdmin = false;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        isAuthor = decoded.id && decoded.id.toString() === story.author_id.toString();
        // 检查是否是管理员
        const User = require('../models/User');
        const user = await User.findById(decoded.id);
        isAdmin = user && user.role === 'admin';
      } catch (e) {
        // Token无效或解析失败，不是作者也不是管理员
        isAuthor = false;
        isAdmin = false;
        console.log('Token验证失败:', e.message);
      }
    }
    
    const canReadPublic = story.status === 'published' && story.is_public;
    const canPreview = ['pending', 'rejected'].includes(story.status) && (isAuthor || isAdmin);
    if (!canReadPublic && !canPreview) {
      return res.status(403).json({
        success: false,
        message: 'Story is not available'
      });
    }
    
    const queryOptions = {};
    if (type) queryOptions.type = type;
    
    const nodes = await StoryNode.getStoryNodes(storyIdInt, queryOptions);
    const Branch = require('../models/Branch');
    const branches = await Branch.getStoryBranches(storyIdInt);

    const nodesWithBranches = nodes.map((node) => {
      const nodeBranches = branches.filter((branch) => branch.source_node_id === node.id);
      const choices = nodeBranches.map((branch) => {
        const targetNode = nodes.find((candidate) => candidate.id === branch.target_node_id);
        return {
          id: branch.id,
          text: branch.context || 'Continue',
          targetNodeId: branch.target_node_id,
          targetNode: targetNode ? {
            id: targetNode.id,
            title: targetNode.title
          } : null
        };
      });

      return {
        id: node.id,
        _id: node.id,
        temporaryId: node.id,
        storyId: node.story_id || node.storyId,
        title: node.title || 'Untitled node',
        content: node.content || '',
        type: node.type || 'regular',
        parentId: node.parent_id || null,
        isRoot: node.is_root === 1 || node.is_root === true || node.isRoot === true,
        order: node.order || 1,
        x: node.x || 0,
        y: node.y || 0,
        choices
      };
    });

    console.log(`Loaded ${nodesWithBranches.length} nodes for story ${storyIdInt}`);
    
    res.json({
      success: true,
      data: nodesWithBranches
    });
  } catch (error) {
    console.error('获取节点列表失败:', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.get('/stories/:storyId/tree', authGuard, storyAuth, async (req, res, next) => {
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
    
    // 构建树结构    const rootNode = nodes.find(n => n.is_root);
    if (!rootNode) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
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
    console.error('获取故事树失败', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.get('/stories/:storyId/nodes', authGuard, storyAuth, async (req, res, next) => {
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 创建根节点（新故事）
router.post('/stories/:storyId/root', authGuard, async (req, res, next) => {
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
    
    const story = await Story.findById(parseInt(storyId));
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 检查是否已有根节点 - 鍏佽閲嶅璋冪敤锛岃繑鍥炲凡瀛樺湪鐨勬牴鑺傜偣
    const existingRoot = await StoryNode.getRootNode(parseInt(storyId));
    if (existingRoot) {
      return res.status(200).json({
        success: true,
        message: 'Story node request failed',
        data: existingRoot
      });
    }
    
    const rootNode = await StoryNode.create({
      story_id: storyId,
      storyId: storyId,
      title: title || 'Story start',
      content: content || 'This is the beginning of the story.',
      type: 'regular',
      is_root: true,
      x: 400,
      y: 50
    });
    
    res.status(201).json({
      success: true,
      message: 'Story node request failed',
      data: rootNode
    });
  } catch (error) {
    console.error('创建根节点失败', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.post('/stories/:storyId/nodes', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    let { parentId, title, content, type, description, choices, position } = req.body;
    
    // 验证输入
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '鑺傜偣鏍囬涓嶈兘涓虹┖'
      });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '鑺傜偣鍐呭涓嶈兘涓虹┖'
      });
    }
    
    // 验证type的有效值    const validTypes = ['normal', 'choice', 'ending'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '鏃犳晥鐨勮妭鐐圭被鍨嬶紝鍏佽鐨勫€硷細normal, choice, ending'
      });
    }
    
    // 验证choices数组
    if (choices && !Array.isArray(choices)) {
      return res.status(400).json({
        success: false,
        message: 'Story node request failed',
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
        message: 'Story node request failed',
      });
    }
    
    console.log('🔍 鏀跺埌鐨勮姹傛暟鎹?', JSON.stringify(req.body, null, 2));
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID'
      });
    }
    
    // 鍑嗗鑺傜偣鏁版嵁
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
      // 楠岃瘉鐖惰妭鐐规槸鍚﹀瓨鍦ㄤ笖灞炰簬鍚屼竴涓晠浜?      const parentNode = await StoryNode.findById(parentId);
      if (!parentNode || parentNode.story_id !== parseInt(storyId)) {
        return res.status(400).json({
          success: false,
          message: 'Story node request failed',
        });
      }
      // 创建子节点      newNode = await StoryNode.create(nodeData);
    } else {
      // 如果没有parentId锛屾鏌ユ槸鍚﹀凡鏈夋牴鑺傜偣
      const existingRoot = await StoryNode.getRootNode(parseInt(storyId));
      if (existingRoot) {
        // 濡傛灉宸叉湁鏍硅妭鐐癸紝鍒涘缓鏅€氬瓙鑺傜偣
        newNode = await StoryNode.create(nodeData);
      } else {
        // 创建根节点        nodeData.is_root = true;
        nodeData.x = position ? position.x : 400;
        nodeData.y = position ? position.y : 50;
        newNode = await StoryNode.create(nodeData);
      }
    }
    
    // 如果提供了choices鏁扮粍锛屽垱寤哄搴旂殑鍒嗘敮
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.post('/stories/:storyId/nodes/batch', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { nodes } = req.body;
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return res.status(400).json({
        success: false,
        message: '无效的故事ID格式'
      });
    }
    
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    if (nodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: '节点数据不能为空'
      });
    }
    
    console.log(`Batch saving nodes: storyId=${storyId}, count=${nodes.length}`);
    
    // 使用新的批量处理方法
    const savedNodes = await StoryNode.processNodeRelations(nodes, parseInt(storyId));
    
    console.log(`Batch save complete: nodes=${savedNodes.nodes?.length || 0}, branches=${savedNodes.branchesCreated || 0}`);
    
    res.status(201).json({
      success: true,
      message: '节点批量保存成功',
      data: savedNodes
    });
  } catch (error) {
    console.error('批量保存节点失败:', error);
    console.error('閿欒鍫嗘爤:', error.stack);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 更新节点
router.put('/nodes/:nodeId', authGuard, async (req, res, next) => {
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
        message: 'Story node request failed',
      });
    }
    
    if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 验证type的有效值    const validTypes = ['normal', 'choice', 'ending'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '鏃犳晥鐨勮妭鐐圭被鍨嬶紝鍏佽鐨勫€硷細normal, choice, ending'
      });
    }
    
    // 验证choices数组
    if (choices && !Array.isArray(choices)) {
      return res.status(400).json({
        success: false,
        message: 'Story node request failed',
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
        message: 'Story node request failed',
      });
    }
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 妫€鏌ユ潈闄愶細鑾峰彇鑺傜偣鎵€灞炵殑鏁呬簨锛岀劧鍚庢鏌ョ敤鎴锋槸鍚︽槸鏁呬簨浣滆€?    const story = await Story.findById(node.story_id);
    if (!story || story.author_id !== parseInt(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '鏃犳潈闄愪慨鏀规鑺傜偣'
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
    
    // 如果提供了choices鏁扮粍锛屾洿鏂板搴旂殑鍒嗘敮
    if (choices && Array.isArray(choices)) {
      const Branch = require('../models/Branch');
      // 删除该节点的所有出向分支      await Branch.deleteNodeBranches(nodeId);
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 删除节点及其子树
router.delete('/nodes/:nodeId', authGuard, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    
    // 检查权限    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    const story = await Story.findById(node.storyId);
    if (!story || story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '鏃犳潈闄愬垹闄ゆ鑺傜偣'
      });
    }
    
    await StoryNode.deleteSubtree(nodeId);
    
    res.json({
      success: true,
      message: 'Story node request failed',
    });
  } catch (error) {
    console.error('删除节点失败:', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 移动节点（改变父节点或顺序）
router.put('/nodes/:nodeId/move', authGuard, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const { newParentId, newOrder } = req.body;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 检查权限    const story = await Story.findById(node.story_id);
    if (!story || story.author_id !== parseInt(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '鏃犳潈闄愮Щ鍔ㄦ鑺傜偣'
      });
    }
    
    // 更新节点位置（MySQL鐗堟湰绠€鍖栧鐞嗭紝鍙洿鏂板潗鏍囷級
    const updateData = {};
    
    if (newParentId) {
      const newParent = await StoryNode.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: 'Story node request failed',
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
      
      // 妫€鏌ユ槸鍚﹀皾璇曠Щ鍔ㄥ埌鑷繁鐨勫瓙鑺傜偣锛堢畝鍗曟鏌ワ級
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
    
    // 更新节点（MySQL鐗堟湰涓紝鑺傜偣浣嶇疆閫氳繃x, y坐标管理，不通过parentId锛?    // 濡傛灉闇€瑕侊紝鍙互閫氳繃鍒嗘敮鍏崇郴鏉ョ鐞嗚妭鐐逛箣闂寸殑杩炴帴
    const updatedNode = await StoryNode.findByIdAndUpdate(nodeId, updateData);
    
    res.json({
      success: true,
      message: '节点移动成功',
      data: updatedNode
    });
  } catch (error) {
    console.error('移动节点失败:', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 鑾峰彇鍗曚釜鑺傜偣锛堟坊鍔犳潈闄愭鏌ワ級
router.get('/nodes/:nodeId', authGuard, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    
    const node = await StoryNode.findById(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 妫€鏌ユ潈闄愶細濡傛灉鑺傜偣鎵€灞炵殑鏁呬簨鏄叕寮€鐨勶紝鍙互鐩存帴璁块棶锛涘惁鍒欓渶瑕佹槸鏁呬簨浣滆€?    const story = await Story.findById(node.storyId);
    if (!story || (!story.isPublic && story.author.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '鏃犳潈闄愯闂鑺傜偣'
      });
    }
    
    res.json({
      success: true,
      data: node
    });
  } catch (error) {
    console.error('获取节点失败:', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.put('/nodes/:nodeId/choices/:choiceId/bind', authGuard, async (req, res, next) => {
  try {
    const { nodeId, choiceId } = req.params;
    const { targetNodeId } = req.body;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 查找并更新选项
    const Branch = require('../models/Branch');
    const branches = await Branch.getOutgoingBranches(nodeId);
    const branch = branches.find(b => b.id === choiceId);
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    const choice = { id: branch.id, targetNodeId: branch.target_node_id, context: branch.context };
    if (!choice) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 楠岃瘉鐩爣鑺傜偣
    if (targetNodeId) {
      const targetNode = await StoryNode.findById(targetNodeId);
      if (!targetNode) {
        return res.status(404).json({
          success: false,
          message: 'Story node request failed',
        });
      }
      
      // 妫€鏌ュ惊鐜紩鐢紙绠€鍗曟鏌ワ細涓嶈兘缁戝畾鍒拌嚜宸憋級
      if (targetNodeId === nodeId) {
        return res.status(400).json({
          success: false,
          message: 'Story node request failed',
        });
      }
      
      // 妫€鏌ユ槸鍚﹀舰鎴愬惊鐜紙閫氳繃妫€鏌ョ洰鏍囪妭鐐圭殑鍑哄悜鍒嗘敮锛?      const Branch = require('../models/Branch');
      const targetBranches = await Branch.getOutgoingBranches(targetNodeId);
      const targetNodeIds = targetBranches.map(b => b.target_node_id);
      if (targetNodeIds.includes(nodeId)) {
        return res.status(400).json({
          success: false,
          message: '涓嶈兘缁戝畾鍒拌嚜宸辩殑瀛愯妭鐐癸紙浼氬舰鎴愬惊鐜級'
        });
      }
    }
    
    if (targetNodeId && isValidStringId(targetNodeId)) {
      // 鍒犻櫎鏃у垎鏀紝鍒涘缓鏂板垎鏀?      await Branch.findByIdAndDelete(branch.id);
      await Branch.createBranch(nodeId, targetNodeId, choice.context || branch.context);
    }
    
    res.json({
      success: true,
      message: '选项绑定成功',
      data: choice
    });
  } catch (error) {
    console.error('绑定选项失败:', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.post('/nodes/:nodeId/choices', authGuard, async (req, res, next) => {
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
        message: 'Story node request failed',
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 更新节点的选项
// Update a node choice.
router.put('/nodes/:nodeId/choices/:choiceId', authGuard, async (req, res, next) => {
  try {
    const { nodeId, choiceId } = req.params;
    const { text, targetNodeId } = req.body;

    if (!isValidStringId(nodeId) || !isValidStringId(choiceId)) {
      return res.status(400).json({ success: false, message: 'Invalid node or choice ID' });
    }

    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }

    const Branch = require('../models/Branch');
    const branches = await Branch.getOutgoingBranches(nodeId);
    const branch = branches.find((item) => item.id === choiceId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Choice not found' });
    }

    const nextText = text !== undefined ? String(text).trim() : branch.context;
    if (!nextText) {
      return res.status(400).json({ success: false, message: 'Choice text cannot be empty' });
    }

    const nextTargetNodeId = targetNodeId !== undefined ? targetNodeId : branch.target_node_id;
    if (nextTargetNodeId) {
      if (!isValidStringId(nextTargetNodeId)) {
        return res.status(400).json({ success: false, message: 'Invalid target node ID' });
      }
      if (nextTargetNodeId === nodeId) {
        return res.status(400).json({ success: false, message: 'Choice cannot target the same node' });
      }
      const targetNode = await StoryNode.findById(nextTargetNodeId);
      if (!targetNode) {
        return res.status(404).json({ success: false, message: 'Target node not found' });
      }
    }

    await Branch.findByIdAndDelete(branch.id);
    let updatedBranch = null;
    if (nextTargetNodeId) {
      updatedBranch = await Branch.createBranch(nodeId, nextTargetNodeId, nextText);
    }

    res.json({
      success: true,
      message: 'Choice updated successfully',
      data: {
        id: updatedBranch?.id || choiceId,
        text: nextText,
        targetNodeId: nextTargetNodeId || null
      }
    });
  } catch (error) {
    console.error('Update choice failed:', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 删除节点的选项
router.delete('/nodes/:nodeId/choices/:choiceId', authGuard, async (req, res, next) => {
  try {
    const { nodeId, choiceId } = req.params;
    
    const node = await StoryNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // MySQL鐗堟湰涓紝choices通过branches琛ㄧ鐞?    // 鏌ユ壘瀵瑰簲鐨勫垎鏀苟鍒犻櫎
    const Branch = require('../models/Branch');
    const branch = await Branch.findById(choiceId);
    if (!branch || branch.source_node_id !== nodeId) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 复制节点
router.post('/nodes/:nodeId/copy', authGuard, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const { newParentId } = req.body;
    
    const originalNode = await StoryNode.findById(nodeId);
    if (!originalNode) {
      return res.status(404).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    const story = await Story.findById(originalNode.storyId);
    if (!story || story.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '鏃犳潈闄愬鍒舵鑺傜偣'
      });
    }
    
    // 验证新父节点ID锛堝鏋滄彁渚涳級
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
          message: 'Story node request failed',
        });
      }
      
      if (parentNode.storyId.toString() !== originalNode.storyId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Story node request failed',
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 调整节点顺序
router.put('/stories/:storyId/nodes/reorder', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { nodeOrders } = req.body;
    
    // 验证输入
    if (!nodeOrders || !Array.isArray(nodeOrders)) {
      return res.status(400).json({
        success: false,
        message: 'Story node request failed',
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// 搜索节点
router.get('/stories/:storyId/nodes/search', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { keyword, limit, offset, searchInContent } = req.query;
    
    // 验证输入
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Story node request failed',
      });
    }
    
    // 鍑嗗鎼滅储閫夐」
    const options = {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
      searchInContent: searchInContent !== 'false' // 榛樿鎼滅储鍐呭
    };
    
    // 搜索节点（MySQL版本：使用简单查询級
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
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

// Route
router.get('/stories/:storyId/validate', authGuard, storyAuth, async (req, res, next) => {
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
    
    // 妫€鏌ユ瘡涓妭鐐圭殑鍒嗘敮
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
    console.error('验证故事一致性失败', error);
    return next(errorFormat(500, 'Story node operation failed', [{ message: error.message }], 10004));
  }
});

module.exports = router;