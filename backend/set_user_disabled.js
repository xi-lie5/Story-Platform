const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('连接数据库成功');
    const User = require('./models/User');
    
    const user = await User.findOne({ email: 'testuser2@example.com' });
    if (user) {
      user.isActive = false;
      await user.save();
      console.log('测试用户已设置为禁用状态');
      console.log('用户名:', user.username);
      console.log('邮箱:', user.email);
      console.log('isActive:', user.isActive);
      console.log('');
      console.log('现在可以访问 http://localhost:8000/admin-easy.html');
      console.log('进入"用户管理"标签，找到testuser2用户');
      console.log('点击"启用"按钮测试功能');
    }
    
    await mongoose.connection.close();
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
  });