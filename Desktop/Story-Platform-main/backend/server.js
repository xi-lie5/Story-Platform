const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');
const { testConnection, initTables } = require('./config/database');
const Category = require('./models/Category');

// server.js从server根目录加载.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const BASE_URL = '/api/v1';

// 基础安全 & 解析中间件
// app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN === '*' ? true : (process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));



// 静态资源（头像、封面）
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

// 前端静态文件服务 - 优化配置，处理所有静态文件请求，包括HTML文件
// 先处理API路由，再处理静态文件请求
// 使用更简单的静态文件服务配置
app.use(express.static(path.join(__dirname, '../front'), {
  index: 'index.html',
  extensions: ['html', 'htm']
}));

// 为所有HTML文件添加直接访问支持（不带.html后缀）
app.get(/^\/([a-zA-Z0-9_\-]+)$/, (req, res, next) => {
  const filename = req.params[0];
  const filePath = path.join(__dirname, '../front', `${filename}.html`);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return next();
    }
    res.sendFile(filePath);
  });
});

// 健康检查
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API 根信息
app.get(BASE_URL, (req, res) => {
  res.status(200).json({
    message: '欢迎使用AI故事创作平台API',
    version: '1.0.0',
    endpoints: [
      `${BASE_URL}/auth`,
      `${BASE_URL}/stories`,
      `${BASE_URL}/storyNodes`,
      `${BASE_URL}/categories`,
      `${BASE_URL}/users`,
      `${BASE_URL}/interactions`,
      `${BASE_URL}/admin`,
      `${BASE_URL}/branches`,
      `${BASE_URL}/characters`
    ]
  });
});



// 路由注册
console.log('注册路由...');
try {
  app.use(`${BASE_URL}/auth`, require('./routes/auth'));
  console.log('✅ auth路由注册成功');
} catch(e) {
  console.error('❌ auth路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/stories`, require('./routes/stories'));
  console.log('✅ stories路由注册成功');
} catch(e) {
  console.error('❌ stories路由注册失败:', e.message);
}



try {
  app.use(`${BASE_URL}/storyNodes`, require('./routes/storyNodes'));
  console.log('✅ storyNodes路由注册成功');
} catch(e) {
  console.error('❌ storyNodes路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/categories`, require('./routes/categories'));
  console.log('✅ categories路由注册成功');
} catch(e) {
  console.error('❌ categories路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/users`, require('./routes/users'));
  console.log('✅ users路由注册成功');
} catch(e) {
  console.error('❌ users路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/interactions`, require('./routes/interactions')); // 用户交互功能路由（收藏、评分等）
  console.log('✅ interactions路由注册成功');
} catch(e) {
  console.error('❌ interactions路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/admin`, require('./routes/admin')); // 管理员功能路由
  console.log('✅ admin路由注册成功');
} catch(e) {
  console.error('❌ admin路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/branches`, require('./routes/branches')); // 分支路由
  console.log('✅ branches路由注册成功');
} catch(e) {
  console.error('❌ branches路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/characters`, require('./routes/characters')); // 角色路由
  console.log('✅ characters路由注册成功');
} catch(e) {
  console.error('❌ characters路由注册失败:', e.message);
}

console.log('所有路由注册完成');

// 前端静态文件服务 - 简化配置，使用更直接的方式处理所有静态文件请求
// 确保API路由优先处理，静态文件服务放在最后
app.use(express.static(path.join(__dirname, '../front')));

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// 初始化默认分类（如果数据库中没有任何分类）
async function initializeDefaultCategories() {
  try {
    const categoryCount = await Category.countDocuments();
    
    if (categoryCount === 0) {
      console.log('📦 检测到数据库中没有分类，正在创建默认分类...');
      
      const defaultCategories = [
        { name: '默认分类', description: '系统默认分类' },
        { name: '奇幻冒险', description: '奇幻冒险类故事' },
        { name: '科幻未来', description: '科幻未来类故事' },
        { name: '悬疑推理', description: '悬疑推理类故事' },
        { name: '爱情故事', description: '爱情类故事' },
        { name: '恐怖惊悚', description: '恐怖惊悚类故事' },
        { name: '其他类型', description: '其他类型的故事' }
      ];
      
      const createdCategories = await Category.insertMany(defaultCategories);
      console.log(`✅ 成功创建 ${createdCategories.length} 个默认分类`);
      
      return createdCategories;
    } else {
      console.log(`✅ 数据库中已有 ${categoryCount} 个分类`);
      return [];
    }
  } catch (error) {
    // 如果创建失败（例如分类已存在），不影响服务器启动
    console.warn('⚠️ 初始化默认分类时出现问题:', error.message);
    return [];
  }
}

async function startServer() {
  try {
    // 测试MySQL连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('MySQL数据库连接失败');
    }

    // 初始化数据库表结构
    await initTables();
    console.log('✅ 数据库表初始化完成');

    // 初始化默认分类
    await initializeDefaultCategories();

    app.listen(PORT, () => {
      console.log(`🚀 服务运行在 http://localhost:${PORT}${BASE_URL}`);
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;