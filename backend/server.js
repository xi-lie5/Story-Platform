const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');
const { testConnection, initTables, createAiStoryTables } = require('./config/database');
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



// 静态资源（头像、封面）- 使用具体路径，避免与API冲突
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

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
      `${BASE_URL}/characters`,
      `${BASE_URL}/ai/story`
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

try {
  app.use(`${BASE_URL}/ai`, require('./routes/ai')); // AI服务路由 (润色)
  console.log('✅ ai路由注册成功');
} catch(e) {
  console.error('❌ ai路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/aiStory`, require('./routes/aiStory')); // AI故事模式路由
  console.log('✅ aiStory路由注册成功');
} catch(e) {
  console.error('❌ aiStory路由注册失败:', e.message);
}

console.log('所有路由注册完成');

// 前端静态文件服务 - 必须放在API路由之后，确保API请求不被拦截
// 使用条件中间件，只处理非API路径的请求
const staticFileHandler = express.static(path.join(__dirname, '../front'), {
  index: 'index.html',
  extensions: ['html', 'htm']
});

app.use((req, res, next) => {
  // 如果请求路径以 /api 开头，跳过静态文件服务，继续下一个中间件
  if (req.path.startsWith('/api')) {
    return next();
  }
  // 否则，尝试静态文件服务
  staticFileHandler(req, res, (err) => {
    if (err) {
      return next(err);
    }
    // 如果静态文件服务没有找到文件，继续下一个中间件
    next();
  });
});

// 为所有HTML文件添加直接访问支持（不带.html后缀）- 只在非API路径上
app.get(/^\/([a-zA-Z0-9_\-]+)$/, (req, res, next) => {
  // 如果请求路径以 /api 开头，跳过
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  const filename = req.params[0];
  const filePath = path.join(__dirname, '../front', `${filename}.html`);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return next();
    }
    res.sendFile(filePath);
  });
});

// 404 处理 - 必须放在所有路由之后，但错误处理之前
// 处理所有未匹配的API路径
app.use((req, res, next) => {
  // 如果请求路径以 /api 开头，说明是API请求，但没有匹配到路由
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API端点不存在: ${req.method} ${req.originalUrl}`,
      error: 'NOT_FOUND',
      code: 10004
    });
  }
  // 否则继续下一个中间件（可能是静态文件处理）
  next();
});

// 错误处理中间件 - 必须放在所有路由和中间件之后
// Express错误处理中间件必须有4个参数：(err, req, res, next)
// 直接使用errorHandler，不要包装
app.use(errorHandler);

// 兜底：处理所有未处理的错误（确保返回JSON）
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

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
    // 检查必要的环境变量
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET环境变量未配置！请在.env文件中设置JWT_SECRET');
      console.error('提示：JWT_SECRET应该是至少32个字符的随机字符串');
      process.exit(1);
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      console.error('❌ JWT_REFRESH_SECRET环境变量未配置！请在.env文件中设置JWT_REFRESH_SECRET');
      console.error('提示：JWT_REFRESH_SECRET应该是至少32个字符的随机字符串，且与JWT_SECRET不同');
      process.exit(1);
    }

    // 测试MySQL连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('MySQL数据库连接失败');
    }

    // 初始化数据库表结构
    await initTables();
    await createAiStoryTables();
    console.log('✅ 数据库表初始化完成');

    // 初始化默认分类
    await initializeDefaultCategories();

    app.listen(PORT, () => {
      console.log(`🚀 服务运行在 http://localhost:${PORT}${BASE_URL}`);
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

startServer();

module.exports = app;