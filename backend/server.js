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
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));

// 静态资源（头像、封面）
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

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
      `${BASE_URL}/categories`,
      `${BASE_URL}/users`
    ]
  });
});

// 路由注册
app.use(`${BASE_URL}/auth`, require('./routes/auth'));
app.use(`${BASE_URL}/stories`, require('./routes/stories'));
app.use(`${BASE_URL}/sections`, require('./routes/sections'));
app.use(`${BASE_URL}/categories`, require('./routes/categories'));
app.use(`${BASE_URL}/users`, require('./routes/users'));
app.use(`${BASE_URL}`, require('./routes/collections')); // 收藏功能路由

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