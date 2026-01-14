const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const StoryNode = require('../models/StoryNode');
const Story = require('../models/Story');
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');
const { errorFormat } = require('../utils/errorFormat');
const { isValidIntegerId, isValidStringId } = require('../utils/idValidator');

// 获取故事的所有分支
router.get('/stories/:storyId/branches', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    const branches = await Branch.getStoryBranches(storyId);
    
    res.json({
      success: true,
      message: '获取分支列表成功',
      data: branches
    });
  } catch (error) {
    console.error('获取分支列表失败:', error);
    next(error);
  }
});

// 获取节点的所有出向分支
router.get('/nodes/:nodeId/branches/outgoing', authGuard, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    
    if (!isValidStringId(nodeId)) {
      return next(errorFormat(400, '无效的节点ID', [], 10020));
    }
    
    const branches = await Branch.getOutgoingBranches(nodeId);
    
    res.json({
      success: true,
      message: '获取出向分支成功',
      data: branches
    });
  } catch (error) {
    console.error('获取出向分支失败:', error);
    next(error);
  }
});

// 获取节点的所有入向分支
router.get('/nodes/:nodeId/branches/incoming', authGuard, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    
    if (!isValidStringId(nodeId)) {
      return next(errorFormat(400, '无效的节点ID', [], 10020));
    }
    
    const branches = await Branch.getIncomingBranches(nodeId);
    
    res.json({
      success: true,
      message: '获取入向分支成功',
      data: branches
    });
  } catch (error) {
    console.error('获取入向分支失败:', error);
    next(error);
  }
});

// 创建分支
router.post('/stories/:storyId/branches', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { sourceNodeId, targetNodeId, context } = req.body;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    if (!sourceNodeId || !targetNodeId) {
      return next(errorFormat(400, '源节点ID和目标节点ID必填', [], 10021));
    }
    
    if (!isValidStringId(sourceNodeId) || !isValidStringId(targetNodeId)) {
      return next(errorFormat(400, '无效的节点ID', [], 10020));
    }
    
    const branch = await Branch.createBranch(sourceNodeId, targetNodeId, context, storyId);
    
    res.status(201).json({
      success: true,
      message: '创建分支成功',
      data: branch
    });
  } catch (error) {
    console.error('创建分支失败:', error);
    next(errorFormat(400, error.message || '创建分支失败', [], 10022));
  }
});

// 批量创建分支
router.post('/stories/:storyId/branches/batch', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { branches } = req.body;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    if (!Array.isArray(branches)) {
      return next(errorFormat(400, 'branches必须是数组', [], 10023));
    }
    
    const results = await Branch.createBranches(branches);
    
    res.status(201).json({
      success: true,
      message: '批量创建分支完成',
      data: results
    });
  } catch (error) {
    console.error('批量创建分支失败:', error);
    next(errorFormat(400, error.message || '批量创建分支失败', [], 10024));
  }
});

// 删除分支
router.delete('/branches/:branchId', authGuard, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    
    if (!isValidStringId(branchId)) {
      return next(errorFormat(400, '无效的分支ID', [], 10025));
    }
    
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return next(errorFormat(404, '分支不存在', [], 10025));
    }
    
    // 检查权限：只有故事作者可以删除分支
    const story = await Story.findById(branch.storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }
    
    if (story.author.toString() !== req.user.id) {
      return next(errorFormat(403, '没有权限删除此分支', [], 10011));
    }
    
    await Branch.findByIdAndDelete(branchId);
    
    res.json({
      success: true,
      message: '删除分支成功'
    });
  } catch (error) {
    console.error('删除分支失败:', error);
    next(error);
  }
});

module.exports = router;

