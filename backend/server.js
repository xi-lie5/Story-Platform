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

// 全局请求日志中间件 - 放在最前面
app.use((req, res, next) => {
  console.log(`🔍 REQUEST: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`🔍 Path: ${req.path}`);
  console.log(`🔍 Base URL: ${req.baseUrl}`);
  next();
});

// 基础安全 & 解析中间件
// app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));

// 静态资源（头像、封面）
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

// 配置前端静态文件服务
app.use(express.static(path.join(__dirname, '../front')));

// 暂时禁用 morgan 以避免日志干扰
// if (process.env.NODE_ENV !== 'production') {
//   app.use(morgan('dev'));
// }

// 健康检查
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 测试端点 - 用于调试
app.get('/test', (req, res) => {
  console.log('=== TEST ENDPOINT HIT ===');
  process.stdout.write('=== TEST ENDPOINT HIT ===\n');
  process.stdout.flush();
  res.status(200).json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// API 根信息
app.get(BASE_URL, (req, res) => {
  const timestamp = new Date().toISOString();
  process.stdout.write(`[${timestamp}] === Root API route hit ===\n`);
  process.stdout.write(`[${timestamp}] Method: ${req.method}\n`);
  process.stdout.write(`[${timestamp}] Original URL: ${req.originalUrl}\n`);
  process.stdout.write(`[${timestamp}] Path: ${req.path}\n`);
  process.stdout.write(`[${timestamp}] Base URL: ${req.baseUrl}\n`);
  process.stdout.write(`[${timestamp}] Protocol: ${req.protocol}\n`);
  process.stdout.write(`[${timestamp}] Host: ${req.get('host')}\n`);
  process.stdout.write(`[${timestamp}] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}\n`);
  process.stdout.write(`[${timestamp}] Headers: ${JSON.stringify(req.headers, null, 2)}\n`);
  process.stdout.write(`[${timestamp}] Query params: ${JSON.stringify(req.query)}\n`);
  process.stdout.write(`[${timestamp}] Environment: NODE_ENV=${process.env.NODE_ENV}\n`);
  process.stdout.write(`[${timestamp}] BASE_URL constant: ${BASE_URL}\n`);
  process.stdout.flush(); // 强制刷新输出缓冲区
  
  const responseData = {
    message: '欢迎使用AI故事创作平台API',
    version: '1.0.0',
    endpoints: [
      `${BASE_URL}/auth`,
      `${BASE_URL}/stories`,
      `${BASE_URL}/sections`,
      `${BASE_URL}/categories`,
      `${BASE_URL}/users`,
      `${BASE_URL}/interactions`,
      `${BASE_URL}/admin`
    ]
  };
  
  process.stdout.write(`[${timestamp}] Sending response: ${JSON.stringify(responseData, null, 2)}\n`);
  res.status(200).json(responseData);
  process.stdout.write(`[${timestamp}] Response sent\n`);
  process.stdout.flush(); // 强制刷新输出缓冲区
});

// 路由注册
app.use(`${BASE_URL}/auth`, require('./routes/auth'));
app.use(`${BASE_URL}/stories`, require('./routes/stories'));
app.use(`${BASE_URL}/sections`, require('./routes/sections'));
app.use(`${BASE_URL}/storyNodes`, require('./routes/storyNodes'));
app.use(`${BASE_URL}/categories`, require('./routes/categories'));
app.use(`${BASE_URL}/users`, require('./routes/users'));
app.use(`${BASE_URL}/interactions`, require('./routes/interactions')); // 用户交互功能路由（收藏、评分等）
app.use(`${BASE_URL}/admin`, require('./routes/admin')); // 管理员功能路由

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