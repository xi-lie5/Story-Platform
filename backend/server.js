const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');
const { testConnection } = require('./config/database');
const { migrate } = require('./db/migrate');
const Category = require('./models/Category');

// server.js 从 server 根目录加载 .env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const BASE_URL = '/api/v1';

// Basic security and parsing middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试', code: 429 }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI请求过于频繁，请稍后再试', code: 429 }
});
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

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API root info
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
      `${BASE_URL}/comments`,
      `${BASE_URL}/admin`,
      `${BASE_URL}/branches`,
      `${BASE_URL}/characters`,
      `${BASE_URL}/ai`,
      `${BASE_URL}/aiStory`
    ]
  });
});



// Route registration
try {
  app.use(`${BASE_URL}/auth`, require('./routes/auth'));
  console.log('auth routes registered');
} catch(e) {
  console.error('auth路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/stories`, require('./routes/stories'));
  console.log('stories routes registered');
} catch(e) {
  console.error('stories路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/storyNodes`, require('./routes/storyNodes'));
  console.log('storyNodes routes registered');
} catch(e) {
  console.error('storyNodes路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/categories`, require('./routes/categories'));
  console.log('categories routes registered');
} catch(e) {
  console.error('categories路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/users`, require('./routes/users'));
  console.log('users routes registered');
} catch(e) {
  console.error('users路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/interactions`, require('./routes/interactions')); // 用户互动功能路由（收藏、评分等）
  console.log('interactions routes registered');
} catch(e) {
  console.error('interactions路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/comments`, require('./routes/comments')); // 评论路由
  console.log('comments routes registered');
} catch(e) {
  console.error('comments路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/admin`, require('./routes/admin')); // 管理员功能路由
  console.log('admin routes registered');
} catch(e) {
  console.error('admin路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/branches`, require('./routes/branches')); // 分支路由
  console.log('branches routes registered');
} catch(e) {
  console.error('branches路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/characters`, require('./routes/characters')); // 角色路由
  console.log('characters routes registered');
} catch(e) {
  console.error('characters路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/ai`, require('./routes/ai')); // AI服务路由 (润色)
  console.log('ai routes registered');
} catch(e) {
  console.error('ai路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/aiStory`, require('./routes/aiStory')); // AI故事模式路由
  console.log('aiStory routes registered');
} catch(e) {
  console.error('aiStory路由注册失败:', e.message);
}

console.log('All routes registered');

// 前端静态文件服务 - 必须放在API路由之后，确保API请求不被拦截
// Frontend static file handler
const staticFileHandler = express.static(path.join(__dirname, '../front'), {
  index: 'index.html',
  extensions: ['html', 'htm'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
    }
  }
});

app.use((req, res, next) => {
  // 如果请求路径以 /api 开头，跳过静态文件服务，继续下一个中间件
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Try static files for non-API requests
  staticFileHandler(req, res, (err) => {
    if (err) {
      return next(err);
    }
    // 如果静态文件服务没有找到文件，继续下一个中间件
    next();
  });
});

// Support extensionless HTML page URLs
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
  // Return JSON 404 for unmatched API routes
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
// Error handling middleware
app.use(errorHandler);

// Last-resort process error logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

const PORT = process.env.PORT || 5000;

// Initialize default categories when the database is empty.
async function initializeDefaultCategories() {
  try {
    const categoryCount = await Category.countDocuments();

    if (categoryCount > 0) {
      console.log(`Default categories already exist: ${categoryCount}`);
      return [];
    }

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
    console.log(`Created ${createdCategories.length} default categories`);
    return createdCategories;
  } catch (error) {
    console.warn('Default category initialization skipped:', error.message);
    return [];
  }
}

async function startServer() {
  try {
    // 检查必要的环境变量
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured. Set it in backend/.env.');
      console.error('JWT_SECRET should be a random string with at least 32 characters.');
      process.exit(1);
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      console.error('JWT_REFRESH_SECRET is not configured. Set it in backend/.env.');
      console.error('JWT_REFRESH_SECRET should be at least 32 characters and differ from JWT_SECRET.');
      process.exit(1);
    }

    // 测试MySQL连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('MySQL database connection failed');
    }

    // Run database migrations before accepting requests.
    await migrate();
    console.log('Database migrations completed');

    // Initialize default categories
    await initializeDefaultCategories();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}${BASE_URL}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

startServer();

module.exports = app;
