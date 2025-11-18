const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    await mongoose.connect('mongodb+srv://louwaikei20041014_db_user:dAkkk0M2SEDciQCo@cluster0.sg8q5q0.mongodb.net/ai-story-db?appName=Cluster0');
    console.log('数据库连接成功');

    // 查找user@gmail.com用户
    const user = await mongoose.connection.db.collection('users').findOne({ email: 'user@gmail.com' });
    
    if (!user) {
      console.log('未找到 user@gmail.com 用户');
      return;
    }

    console.log('找到用户:', {
      id: user._id,
      username: user.username,
      email: user.email
    });

    // 生成新的密码哈希
    const newPassword = 'user123456';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('新密码哈希:', hashedPassword);
    console.log('新密码哈希长度:', hashedPassword.length);

    // 更新用户密码
    const result = await mongoose.connection.db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log('密码更新结果:', result);

    // 验证新密码
    const updatedUser = await mongoose.connection.db.collection('users').findOne({ email: 'user@gmail.com' });
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    console.log('新密码验证结果:', isMatch);

    mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error);
    mongoose.connection.close();
  }
}

resetPassword();