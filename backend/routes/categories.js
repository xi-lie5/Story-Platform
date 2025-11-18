const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Story = require('../models/Story');
const { body, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { adminGuard } = require('../middleware/adminAuth');
const { errorFormat } = require('../utils/errorFormat');

const router = express.Router();

/**
 * 1. 获取分类列表
 * GET /api/v1/categories
 * 可选：按故事数量排序
 */
router.get('/', async (req, res, next) => {
  try {
    const { sort = 'storyCount' } = req.query;
    
    // 构建排序对象
    const sortObject = {};
    if (sort === 'storyCount') {
      sortObject.storyCount = -1; // 按故事数量降序
    } else if (sort === 'createdAt') {
      sortObject.createdAt = -1; // 按创建时间降序
    }
    
    // 查询分类列表
    const categories = await Category.find().sort(sortObject);
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. 获取单个分类详情
 * GET /api/v1/categories/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 验证分类ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(errorFormat(400, '无效的分类ID', [], 10030));
    }
    
    // 查询分类
    const category = await Category.findById(id);
    
    if (!category) {
      return next(errorFormat(404, '分类不存在', [], 10031));
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. 创建分类（管理员功能）
 * POST /api/v1/categories
 */
router.post('/', 
  authGuard,
  adminGuard,
  [
    body('name').notEmpty().withMessage('分类名称不能为空')
      .isLength({ max: 50 }).withMessage('分类名称不能超过50个字符'),
    body('description').optional()
      .isLength({ max: 200 }).withMessage('分类描述不能超过200个字符')
  ],
  async (req, res, next) => {
    console.log('=== Categories POST route hit ==='); // 调试日志
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    try {
      // 验证请求数据
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(errorFormat(400, '请求数据无效', errors.array(), 10001));
      }
      
      const { name, description } = req.body;
      
      // 检查分类名是否已存在
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        console.log('=== 准备调用errorFormat ===');
        const error = errorFormat(400, '分类名称已存在', [], 10032);
        console.log('errorFormat返回:', error);
        return next(error);
      }
      
      // 创建分类
      const category = await Category.create({
        name,
        description: description || ''
      });
      
      res.status(201).json({
        success: true,
        message: '分类创建成功',
        data: category
      });
    } catch (err) {
      if (err.code === 11000) {
        return next(errorFormat(400, '分类名称已存在', [], 10032));
      }
      next(err);
    }
  }
);

/**
 * 4. 更新分类（管理员功能）
 * PUT /api/v1/categories/:id
 */
router.put('/:id', 
  authGuard,
  adminGuard,
  [
    body('name').optional().notEmpty().withMessage('分类名称不能为空')
      .isLength({ max: 50 }).withMessage('分类名称不能超过50个字符'),
    body('description').optional()
      .isLength({ max: 200 }).withMessage('分类描述不能超过200个字符')
  ],
  async (req, res, next) => {
    console.log('Categories PUT route hit!'); // 调试日志
    try {
      const { id } = req.params;
      
      // 验证分类ID格式
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(errorFormat(400, '无效的分类ID', [], 10030));
      }
      
      // 验证请求数据
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(errorFormat(400, '请求数据无效', errors.array(), 10001));
      }
      
      // 检查分类是否存在
      const category = await Category.findById(id);
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10031));
      }
      
      // 更新分类
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );
      
      res.status(200).json({
        success: true,
        message: '编辑添加成功',
        data: updatedCategory
      });
      console.log('Categories PUT response message: 编辑添加成功'); // 调试日志
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 5. 删除分类（管理员功能）
 * DELETE /api/v1/categories/:id
 * 注意：如果有故事使用此分类，应该提示或设置为未分类
 */
router.delete('/:id', 
  authGuard,
  adminGuard,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // 验证分类ID格式
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(errorFormat(400, '无效的分类ID', [], 10030));
      }
      
      // 检查分类是否存在
      const category = await Category.findById(id);
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10031));
      }
      
      // 检查是否有故事使用此分类
      const storiesCount = await Story.countDocuments({ category: id });
      if (storiesCount > 0) {
        return next(errorFormat(400, `无法删除分类，该分类下还有${storiesCount}个故事`, [], 10033));
      }
      
      // 删除分类
      await Category.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: '分类删除成功'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;