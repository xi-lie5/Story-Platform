const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');

// server.js从server根目录加载.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const BASE_URL = '/api/v1';

// 基础安全 & 解析中间件
// app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));

// 全局请求日志中间件
app.use((req, res, next) => {
  console.log('🌐 收到请求:', req.method, req.path);
  console.log('🌐 完整URL:', req.originalUrl);
  next();
});

// 静态资源（头像、封面）
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

// 前端静态文件服务 - 只对明确的HTML文件路径启用，避免拦截API路由
app.use(['/index.html', '/explore.html', '/create.html', '/login.html', '/register.html', '/profile.html', '/about.html'], 
  express.static(path.join(__dirname, '../front'), {
    index: 'index.html',
    extensions: ['html', 'htm']
  })
);

// 根路径重定向到首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../front/index.html'));
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
      `${BASE_URL}/sections`,
      `${BASE_URL}/storyNodes`,
      `${BASE_URL}/categories`,
      `${BASE_URL}/users`,
      `${BASE_URL}/interactions`,
      `${BASE_URL}/admin`
    ]
  });
});

// 测试路由
app.get(`${BASE_URL}/test`, (req, res) => {
  console.log('🔥 测试路由被访问！');
  res.json({ message: '测试路由工作正常' });
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
  app.use(`${BASE_URL}/sections`, require('./routes/sections'));
  console.log('✅ sections路由注册成功');
} catch(e) {
  console.error('❌ sections路由注册失败:', e.message);
}

try {
  const storyNodesRouter = require('./routes/storyNodes');
  console.log('🔍 storyNodes路由器类型:', typeof storyNodesRouter);
  console.log('🔍 storyNodes路由器名称:', storyNodesRouter.name);
  app.use(`${BASE_URL}/storyNodes`, storyNodesRouter);
  console.log('✅ storyNodes路由注册成功');
} catch(e) {
  console.error('❌ storyNodes路由注册失败:', e.message);
  console.error('❌ 错误堆栈:', e.stack);
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
  app.use(`${BASE_URL}/collections`, require('./routes/collections')); // 收藏功能路由
  console.log('✅ collections路由注册成功');
} catch(e) {
  console.error('❌ collections路由注册失败:', e.message);
}

console.log('所有路由注册完成');

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('Missing required environment variable: MONGODB_URI');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: process.env.NODE_ENV !== 'production'
    });

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