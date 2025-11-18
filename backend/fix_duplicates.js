const mongoose = require('mongoose');

async function fixDuplicateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform');
    console.log('数据库连接成功');

    // 查找所有user@gmail.com用户
    const users = await mongoose.connection.db.collection('users').find({ email: 'user@gmail.com' }).toArray();
    
    console.log('找到的user@gmail.com用户数量:', users.length);
    users.forEach(user => {
      console.log(`- ID: ${user._id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
    });

    if (users.length > 1) {
      // 删除除了第一个之外的所有用户
      for (let i = 1; i < users.length; i++) {
        console.log(`删除用户: ${users[i]._id} (${users[i].username})`);
        await mongoose.connection.db.collection('users').deleteOne({ _id: users[i]._id });
      }
      console.log('重复用户已删除');
    }

    // 验证结果
    const remainingUsers = await mongoose.connection.db.collection('users').find({ email: 'user@gmail.com' }).toArray();
    console.log('剩余的user@gmail.com用户数量:', remainingUsers.length);
    if (remainingUsers.length === 1) {
      const user = remainingUsers[0];
      console.log(`保留的用户: ID: ${user._id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
      
      // 测试这个用户的密码
      const User = require('./models/User');
      const userDoc = await User.findOne({ email: 'user@gmail.com' }).select('+password');
      const isMatch = await userDoc.matchPassword('user123456');
      console.log('密码匹配结果:', isMatch);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error);
    mongoose.connection.close();
  }
}

fixDuplicateUsers();