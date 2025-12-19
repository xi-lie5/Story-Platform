const path = require('path');
const dotenv = require('dotenv');

// 1. 【关键修正】必须最先加载环境变量
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

// 2. 【关键修正】读取环境变量，如果没有设置则默认为 50
const MAX_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE) || 50;

// 中间件配置
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));

app.use('/avatar', express.static(path.join(__dirname, 'avatar')));
app.use('/coverImage', express.static(path.join(__dirname, 'coverImage')));

// 前端静态资源代理... (保持你原有的逻辑不变)
app.use(express.static(path.join(__dirname, '../front'), {
  index: 'index.html',
  extensions: ['html', 'htm']
}));
app.get(/^\/([a-zA-Z0-9_\-]+)$/, (req, res, next) => {
  const filename = req.params[0];
  const filePath = path.join(__dirname, '../front', `${filename}.html`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return next();
    res.sendFile(filePath);
  });
});

app.get('/healthz', (req, res) => { res.status(200).json({ status: 'ok' }); });
app.get(BASE_URL, (req, res) => { res.status(200).json({ message: 'API Running' }); });

// 路由注册... (保持你原有的逻辑不变)
console.log('注册路由...');
try { app.use(`${BASE_URL}/auth`, require('./routes/auth')); } catch(e) {}
try { app.use(`${BASE_URL}/stories`, require('./routes/stories')); } catch(e) {}
try { app.use(`${BASE_URL}/storyNodes`, require('./routes/storyNodes')); } catch(e) {}
try { app.use(`${BASE_URL}/categories`, require('./routes/categories')); } catch(e) {}
try { app.use(`${BASE_URL}/users`, require('./routes/users')); } catch(e) {}
try { app.use(`${BASE_URL}/interactions`, require('./routes/interactions')); } catch(e) {}
try { app.use(`${BASE_URL}/admin`, require('./routes/admin')); } catch(e) {}

app.use(express.static(path.join(__dirname, '../front')));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('Missing MONGODB_URI');
    }

    // 3. 【关键修正】使用正确的配置变量
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: MAX_POOL_SIZE, // 使用上面定义的变量
      minPoolSize: 10,  
      serverSelectionTimeoutMS: 5000, 
    });

    app.listen(PORT, () => {
      console.log(`🚀 服务运行在 http://localhost:${PORT}${BASE_URL}`);
      // 4. 【关键修正】打印真实生效的配置，确保你在日志里看到真相
      console.log(`🔌 [配置生效] 数据库连接池 Max: ${MAX_POOL_SIZE}, Min: 10`);
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error.message);
    process.exit(1);
  }
}

startServer();
module.exports = app;

