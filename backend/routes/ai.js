const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');
const aiController = require('../controllers/aiController');

// AI生成内容相关路由
// 这些路由需要认证，以确保只有注册用户可以使用AI功能

// 生成故事内容
router.post('/generate/content', authGuard, aiController.generateContent);

// 生成角色对话
router.post('/generate/dialogue', authGuard, aiController.generateCharacterDialogue);

// 生成故事分支建议
router.post('/generate/branches', authGuard, aiController.generateBranchSuggestions);

// 转换故事风格
router.post('/convert/style', authGuard, aiController.convertStyle);

// 基于故事节点生成内容
router.post('/generate/node-content', authGuard, storyAuth, aiController.generateNodeContent);

module.exports = router;
