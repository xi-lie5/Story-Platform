// 导入依赖
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载.env配置
dotenv.config();

// 创建服务器实例
const app = express();

// 中间件：解决跨域、解析JSON请求
app.use(cors());
app.use(express.json());

// 连接数据库
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ 数据库连接成功'))
  .catch(err => console.error('❌ 数据库连接失败：', err));

// 测试接口（访问http://localhost:5000/api/test会返回成功消息）
app.get('/api/test', (req, res) => {
  res.send({ message: '后端接口能通啦！' });
});

// 导入路由（后面创建后取消注释）
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/stories', require('./routes/stories'));

// 启动服务器
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 服务器运行在 http://localhost:${port}`);
});