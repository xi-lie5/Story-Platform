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

// 简单测试路由 - 放在最前面，在静态文件服务之前
app.get('/debug-test', (req, res) => {
  const fs = require('fs');
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] === DEBUG TEST ROUTE HIT ===\n`;
  
  // 强制写入多个地方
  process.stdout.write(message);
  console.log('=== DEBUG TEST ROUTE HIT ===');
  fs.appendFileSync('debug.log', message);
  
  res.status(200).json({ message: 'Debug test works!', timestamp });
});

// 全局请求日志中间件 - 放在路由之后，静态文件服务之前
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${req.method} ${req.originalUrl}\n`;
  const headerMessage = `Headers: ${JSON.stringify(req.headers, null, 2)}\n`;
  const urlMessage = `🔍 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}\n`;
  const pathMessage = `🔍 Path: ${req.path}\n`;
  const baseUrlMessage = `🔍 Base URL: ${req.baseUrl}\n`;
  
  // 强制输出到控制台
  process.stdout.write(logMessage);
  process.stdout.write(headerMessage);
  process.stdout.write(urlMessage);
  process.stdout.write(pathMessage);
  process.stdout.write(baseUrlMessage);
  process.stdout.write('=== MIDDLEWARE EXECUTED ===\n');
  
  // 同时使用console.log作为备用
  console.log(logMessage.trim());
  
  // 写入文件作为最后的备用
  const fs = require('fs');
  fs.appendFileSync('debug.log', logMessage + '=== MIDDLEWARE EXECUTED ===\n');
  
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

// 静态资源（头像、封面）- 放在最后
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
});

// 路由注册
console.log('=== REGISTERING ROUTES ===');

app.use(`${BASE_URL}/auth`, require('./routes/auth'));
console.log('Auth router registered');
app.use(`${BASE_URL}/stories`, require('./routes/stories'));
console.log('Stories router registered');
app.use(`${BASE_URL}/sections`, require('./routes/sections'));
console.log('Sections router registered');

// 详细调试storyNodes路由注册
console.log('=== Loading storyNodes route ===');
const storyNodesRoute = require('./routes/storyNodes');
console.log('StoryNodes route type:', typeof storyNodesRoute);
console.log('StoryNodes route constructor:', storyNodesRoute.constructor.name);
if (storyNodesRoute && storyNodesRoute.stack) {
  console.log('StoryNodes route stack length:', storyNodesRoute.stack.length);
  console.log('StoryNodes routes:', storyNodesRoute.stack.map(layer => layer.route?.path || layer.regexp?.toString()));
}
app.use(`${BASE_URL}/storyNodes`, storyNodesRoute);
console.log('StoryNodes router registered');
app.use(`${BASE_URL}/categories`, require('./routes/categories'));
console.log('Categories router registered');
app.use(`${BASE_URL}/users`, require('./routes/users'));
console.log('Users router registered');
app.use(`${BASE_URL}/interactions`, require('./routes/interactions')); // 用户交互功能路由（收藏、评分等）
console.log('Interactions router registered');
app.use(`${BASE_URL}/admin`, require('./routes/admin')); // 管理员功能路由
console.log('Admin router registered');
console.log('=== ALL ROUTES REGISTERED ===');

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
      console.log('=== SERVER STARTED - TESTING ROUTES ===');
      console.log('Available routes:');
      console.log('- GET /debug-test');
      console.log('- GET /test');
      console.log(`- GET ${BASE_URL}`);
      console.log('=== END ROUTE LIST ===');
      
      // 测试内部路由
      process.stdout.write('=== INTERNAL ROUTE TEST ===\n');
      if (app && app._router && app._router.stack) {
        app._router.stack.forEach((middleware, i) => {
          if (middleware.route) {
            console.log(`Route ${i}: ${middleware.route.path} (${Object.keys(middleware.route.methods).join(', ')})`);
          } else if (middleware.name === 'router') {
            console.log(`Router ${i}: ${middleware.regexp}`);
          }
        });
      } else {
        console.log('Router stack not available');
      }
      process.stdout.write('=== END INTERNAL ROUTE TEST ===\n');
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;