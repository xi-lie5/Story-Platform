const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
app.use(express.json());

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform').then(async () => {
  console.log('数据库连接成功');
  
  // 复制auth路由的逻辑进行测试
  app.post('/test-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log('登录尝试:', { email, passwordLength: password ? password.length : 0 });

      const user = await User.findOne({ email }).select('+password +refreshToken');
      
      console.log('查找用户结果:', user ? { id: user._id, username: user.username, email: user.email } : '未找到用户');
      
      if (!user) {
        console.log('用户不存在:', email);
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          errors: [{ message: '邮箱或密码错误' }],
          code: 10006
        });
      }

      const isMatch = await user.matchPassword(password);
      
      console.log('密码匹配结果:', isMatch);
      
      if (!isMatch) {
        console.log('密码不匹配:', email);
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          errors: [{ message: '邮箱或密码错误' }],
          code: 10006
        });
      }

      console.log('登录成功:', { userId: user.id, username: user.username });

      res.status(200).json({
        success: true,
        message: '登录成功',
        data: {
          userId: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('登录过程中出错:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  });

  // 测试登录
  const response = await request(app)
    .post('/test-login')
    .send({
      email: 'user@gmail.com',
      password: 'user123456'
    });

  console.log('测试结果:', response.status, response.body);

  mongoose.connection.close();
}).catch(error => {
  console.error('数据库连接失败:', error.message);
});