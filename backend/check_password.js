const mongoose = require('mongoose');
const User = require('./models/User');

// 连接数据库
mongoose.connect('mongodb+srv://louwaikei20041014_db_user:dAkkk0M2SEDciQCo@cluster0.sg8q5q0.mongodb.net/ai-story-db?appName=Cluster0');

async function checkUserPassword() {
  try {
    console.log('正在查找 user@gmail.com 用户...');
    
    // 查找用户，包含密码字段
    const user = await User.findOne({ email: 'user@gmail.com' }).select('+password');
    
    if (user) {
      console.log('找到用户:', {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        role: user.role,
        passwordHash: user.password ? '存在' : '不存在'
      });
      
      // 测试密码匹配
      const testPassword = 'user123456';
      console.log('测试密码:', testPassword);
      
      const isMatch = await user.matchPassword(testPassword);
      console.log('密码匹配结果:', isMatch);
      
      // 手动验证密码
      const bcrypt = require('bcryptjs');
      const manualMatch = await bcrypt.compare(testPassword, user.password);
      console.log('手动密码匹配结果:', manualMatch);
      
      // 检查密码长度和格式
      console.log('密码哈希长度:', user.password ? user.password.length : 0);
      console.log('密码哈希前缀:', user.password ? user.password.substring(0, 10) : 'N/A');
      
    } else {
      console.log('未找到 user@gmail.com 用户');
    }
    
  } catch (error) {
    console.error('检查用户密码时出错:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserPassword();