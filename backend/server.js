// 导入依赖
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载.env配置
dotenv.config();

const authRoutes = require('./rotues/auth');
// 导入路由（后面创建后取消注释）
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/stories', require('./routes/stories'));

// 创建服务器实例
const app = express();

// 中间件：解决跨域、解析JSON请求
app.use(cors());
app.use(express.json());

// 连接数据库（MongoDB）
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB连接成功'))
  .catch(err => console.error('❌ MongoDB连接失败:', err));


  // 注册路由（匹配API文档的基础URL：/api/v1）
const BASE_URL = '/api/v1';
app.use(`${BASE_URL}/auth`, authRoutes);

// 测试接口（访问http://localhost:5000/api/test会返回成功消息）
app.get('/api/v1/test', (req, res) => {
  res.send({ message: '后端接口能通啦！' });
});

// 全局错误处理中间件（最后注册）
app.use(errorHandler);

// 启动服务
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}${BASE_URL}`);
});