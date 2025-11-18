const mongoose = require('mongoose');
const User = require('./models/User');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('数据库连接成功');
  
  try {
    // 查找用户
    const user = await User.findOne({ email: 'user@gmail.com' }).select('+password');
    console.log('查找用户结果:', user ? {
      id: user._id,
      username: user.username,
      email: user.email,
      passwordHash: user.password ? user.password.substring(0, 20) + '...' : 'null',
      passwordLength: user.password ? user.password.length : 0
    } : '未找到用户');
    
    if (user) {
      // 测试密码匹配
      const testPassword = 'user123456';
      console.log('测试密码:', testPassword);
      
      try {
        const isMatch = await user.matchPassword(testPassword);
        console.log('密码匹配结果:', isMatch);
      } catch (error) {
        console.error('密码匹配出错:', error.message);
      }
      
      // 检查用户状态
      console.log('用户状态:', {
        isLocked: user.isLocked,
        loginAttempts: user.loginAttempts,
        lockUntil: user.lockUntil,
        isActive: user.isActive
      });
    }
    
  } catch (error) {
    console.error('查询出错:', error.message);
  }
  
  mongoose.connection.close();
}).catch(error => {
  console.error('数据库连接失败:', error.message);
});