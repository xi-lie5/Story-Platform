const mongoose = require('mongoose');
const User = require('./models/User');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform').then(async () => {
  console.log('数据库连接成功');
  
  try {
    // 检查用户是否已存在
    const existingUser = await User.findOne({ email: 'user@gmail.com' });
    if (existingUser) {
      console.log('用户已存在，删除旧用户...');
      await User.deleteOne({ email: 'user@gmail.com' });
    }
    
    // 创建新用户
    const newUser = await User.create({
      username: 'testuser2',
      email: 'user@gmail.com',
      password: 'user123456'
    });
    
    console.log('用户创建成功:');
    console.log(`- ID: ${newUser._id}`);
    console.log(`- 用户名: ${newUser.username}`);
    console.log(`- 邮箱: ${newUser.email}`);
    console.log(`- 密码哈希: ${newUser.password.substring(0, 20)}...`);
    
    // 验证密码
    const isMatch = await newUser.matchPassword('user123456');
    console.log(`- 密码验证: ${isMatch ? '成功' : '失败'}`);
    
  } catch (error) {
    console.error('创建用户出错:', error.message);
  }
  
  mongoose.connection.close();
}).catch(error => {
  console.error('数据库连接失败:', error.message);
});