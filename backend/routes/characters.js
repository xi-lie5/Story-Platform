const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const Story = require('../models/Story');
const authGuard = require('../middleware/auth');
const storyAuth = require('../middleware/storyAuth');
const { errorFormat } = require('../utils/errorFormat');
const { isValidIntegerId, isValidStringId } = require('../utils/idValidator');

// 获取故事的所有角色
router.get('/stories/:storyId/characters', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { name } = req.query;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    const options = {};
    if (name) {
      options.name = name;
    }
    
    const characters = await Character.getStoryCharacters(storyId, options);
    
    res.json({
      success: true,
      message: '获取角色列表成功',
      data: characters
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    next(error);
  }
});

// 创建角色
router.post('/stories/:storyId/characters', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { name, description } = req.body;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    if (!name || name.trim() === '') {
      return next(errorFormat(400, '角色名称必填', [], 10026));
    }
    
    if (!description || description.trim() === '') {
      return next(errorFormat(400, '角色描述必填', [], 10027));
    }
    
    // 检查是否已存在同名角色
    const existingChar = await Character.findOne({ storyId, name: name.trim() });
    if (existingChar) {
      return next(errorFormat(400, `角色名称"${name}"已存在`, [], 10028));
    }
    
    const character = new Character({
      storyId,
      name: name.trim(),
      description: description.trim()
    });
    
    await character.save();
    
    res.status(201).json({
      success: true,
      message: '创建角色成功',
      data: character
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    next(errorFormat(400, error.message || '创建角色失败', [], 10029));
  }
});

// 批量创建角色
router.post('/stories/:storyId/characters/batch', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { characters } = req.body;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    if (!Array.isArray(characters)) {
      return next(errorFormat(400, 'characters必须是数组', [], 10030));
    }
    
    const results = await Character.bulkCreateCharacters(characters, storyId);
    
    res.status(201).json({
      success: true,
      message: '批量创建角色完成',
      data: results
    });
  } catch (error) {
    console.error('批量创建角色失败:', error);
    next(errorFormat(400, error.message || '批量创建角色失败', [], 10031));
  }
});

// 更新角色
router.put('/characters/:characterId', authGuard, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { name, description } = req.body;
    
    if (!isValidStringId(characterId)) {
      return next(errorFormat(400, '无效的角色ID', [], 10032));
    }
    
    const character = await Character.findById(characterId);
    if (!character) {
      return next(errorFormat(404, '角色不存在', [], 10032));
    }
    
    // 检查权限：只有故事作者可以修改角色
    const story = await Story.findById(character.storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }
    
    if (story.author.toString() !== req.user.id) {
      return next(errorFormat(403, '没有权限修改此角色', [], 10011));
    }
    
    // 如果更新名称，检查是否重复
    if (name && name.trim() !== character.name) {
      const existingChar = await Character.findOne({ 
        storyId: character.storyId, 
        name: name.trim(),
        _id: { $ne: characterId }
      });
      
      if (existingChar) {
        return next(errorFormat(400, `角色名称"${name}"已存在`, [], 10028));
      }
    }
    
    if (name) character.name = name.trim();
    if (description !== undefined) character.description = description.trim();
    
    await character.save();
    
    res.json({
      success: true,
      message: '更新角色成功',
      data: character
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    next(errorFormat(400, error.message || '更新角色失败', [], 10033));
  }
});

// 批量更新角色
router.put('/stories/:storyId/characters/batch', authGuard, storyAuth, async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { characters } = req.body;
    
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID', [], 10010));
    }
    
    if (!Array.isArray(characters)) {
      return next(errorFormat(400, 'characters必须是数组', [], 10030));
    }
    
    const results = await Character.bulkUpdateCharacters(characters, storyId);
    
    res.json({
      success: true,
      message: '批量更新角色完成',
      data: results
    });
  } catch (error) {
    console.error('批量更新角色失败:', error);
    next(errorFormat(400, error.message || '批量更新角色失败', [], 10034));
  }
});

// 删除角色
router.delete('/characters/:characterId', authGuard, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    
    if (!isValidStringId(characterId)) {
      return next(errorFormat(400, '无效的角色ID', [], 10032));
    }
    
    const character = await Character.findById(characterId);
    if (!character) {
      return next(errorFormat(404, '角色不存在', [], 10032));
    }
    
    // 检查权限：只有故事作者可以删除角色
    const story = await Story.findById(character.storyId);
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10010));
    }
    
    if (story.author.toString() !== req.user.id) {
      return next(errorFormat(403, '没有权限删除此角色', [], 10011));
    }
    
    await Character.findByIdAndDelete(characterId);
    
    res.json({
      success: true,
      message: '删除角色成功'
    });
  } catch (error) {
    console.error('删除角色失败:', error);
    next(error);
  }
});

module.exports = router;

