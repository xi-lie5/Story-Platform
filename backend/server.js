const path = require('path');
const dotenv = require('dotenv');

// 必须最先加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');

const app = express();
const BASE_URL = '/api/v1';

// 读取环境变量
const MAX_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE) || 50;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false, // 如果前端有外链资源，暂时关闭 CSP 避免拦截
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));

// 静态资源
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

// 路由注册
console.log('正在注册路由...');

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
  app.use(`${BASE_URL}/ai`, require('./routes/aiRoutes'));
  console.log('✅ ai路由注册成功');
} catch(e) {
  console.error('❌ ai路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/users`, require('./routes/users'));
  console.log('✅ users路由注册成功');
} catch(e) {
  console.error('❌ users路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/interactions`, require('./routes/interactions'));
  console.log('✅ interactions路由注册成功');
} catch(e) {
  console.error('❌ interactions路由注册失败:', e.message);
}

try {
  app.use(`${BASE_URL}/admin`, require('./routes/admin'));
  console.log('✅ admin路由注册成功');
} catch(e) {
  console.error('❌ admin路由注册失败:', e.message);
}

console.log('所有路由注册完成');

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
      `${BASE_URL}/ai`,
      `${BASE_URL}/users`,
      `${BASE_URL}/interactions`,
      `${BASE_URL}/admin`
    ]
  });
});

// 前端静态资源处理

// 处理特定 HTML 路由（如 /login 匹配 login.html）
app.get(/^\/([a-zA-Z0-9_\-]+)$/, (req, res, next) => {
  const filename = req.params[0];
  const filePath = path.join(__dirname, '../front', `${filename}.html`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return next();
    res.sendFile(filePath);
  });
});

// 托管通用静态资源 (js, css, index.html)
app.use(express.static(path.join(__dirname, '../front'), {
  index: 'index.html',
  extensions: ['html', 'htm']
}));

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('Missing MONGODB_URI');
    }

    // 数据库连接
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: MAX_POOL_SIZE,
      minPoolSize: 10,  
      serverSelectionTimeoutMS: 5000,
    });

    app.listen(PORT, () => {
      console.log(`🚀 服务运行在 http://localhost:${PORT}${BASE_URL}`);
      console.log(`🔌 [配置生效] 数据库连接池 Max: ${MAX_POOL_SIZE}, Min: 10`);
      console.log(`🤖 AI 助手接口: http://localhost:${PORT}${BASE_URL}/ai/generate-story`);
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
