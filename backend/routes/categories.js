const express = require('express');
const Category = require('../models/Category');
const Story = require('../models/Story');
const { body, validationResult } = require('express-validator');
const authGuard = require('../middleware/auth');
const { adminGuard } = require('../middleware/adminAuth');
const { errorFormat } = require('../utils/errorFormat');
const { isValidIntegerId } = require('../utils/idValidator');

const router = express.Router();

/**
 * 1. 获取分类列表
 * GET /api/v1/categories
 * 可选：按故事数量排序
 */
router.get('/', async (req, res, next) => {
  try {
    const { sort = 'storyCount' } = req.query;
    
    // 查询分类列表
    const categories = await Category.find();
    
    // 手动排序
    if (sort === 'storyCount') {
      categories.sort((a, b) => (b.storyCount || 0) - (a.storyCount || 0));
    } else if (sort === 'createdAt') {
      categories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    // 格式化返回数据，确保包含id字段
    const responseData = {
      success: true,
      count: categories.length,
      data: categories.map(category => {
        // category是Category实例，包含id, name, description等字段
        return {
          id: category.id,
          name: category.name,
          description: category.description || '',
          storyCount: category.storyCount || category.story_count || 0,
          createdAt: category.created_at,
          updatedAt: category.updated_at
        };
      })
    };
    
    res.status(200).json(responseData);
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
    if (!isValidIntegerId(id)) {
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
        return next(errorFormat(400, '分类名称已存在', [], 10032));
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
    try {
      const { id } = req.params;
      
      // 验证分类ID格式
      if (!isValidIntegerId(id)) {
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
        req.body
      );
      
      res.status(200).json({
        success: true,
        message: '编辑添加成功',
        data: updatedCategory
      });
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
      if (!isValidIntegerId(id)) {
        return next(errorFormat(400, '无效的分类ID', [], 10030));
      }
      
      // 检查分类是否存在
      const category = await Category.findById(id);
      if (!category) {
        return next(errorFormat(404, '分类不存在', [], 10031));
      }
      
      // 检查是否有故事使用此分类
      const storiesCount = await Story.countDocuments({ category: id, category_id: id, categoryId: id });
      
      if (storiesCount > 0) {
        // 找到"默认分类"
        const defaultCategory = await Category.findOne({ name: '默认分类' });
        
        if (!defaultCategory) {
          return next(errorFormat(404, '未找到默认分类，无法移动故事', [], 10034));
        }
        
        // 获取该分类下的所有故事
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();
        try {
          // 将该分类下的所有故事移动到默认分类
          const [updateResult] = await connection.execute(
            'UPDATE stories SET category_id = ? WHERE category_id = ?',
            [defaultCategory.id, id]
          );
          
          // 更新分类的故事数量
          await Category.updateStoryCount(id, -storiesCount);
          await Category.updateStoryCount(defaultCategory.id, storiesCount);
          
          console.log(`已将 ${updateResult.affectedRows} 个故事从分类 ${id} 移动到默认分类 ${defaultCategory.id}`);
        } finally {
          connection.release();
        }
      }
      
      // 删除分类
      await Category.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: storiesCount > 0 
          ? `分类删除成功，已将${storiesCount}个故事移动到默认分类` 
          : '分类删除成功'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;