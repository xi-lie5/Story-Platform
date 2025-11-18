const mongoose = require('mongoose');
const User = require('./models/User');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform').then(async () => {
  console.log('数据库连接成功');
  
  try {
    // 查找所有用户
    const users = await User.find({});
    console.log('数据库中所有用户:');
    users.forEach(user => {
      console.log(`- ID: ${user._id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
    });
    
    // 查找特定邮箱
    const user = await User.findOne({ email: 'user@gmail.com' });
    console.log('\n查找 user@gmail.com:', user ? '找到' : '未找到');
    
  } catch (error) {
    console.error('查询出错:', error.message);
  }
  
  mongoose.connection.close();
}).catch(error => {
  console.error('数据库连接失败:', error.message);
});