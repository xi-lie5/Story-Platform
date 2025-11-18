const mongoose = require('mongoose');

async function checkAllUsers() {
  try {
    await mongoose.connect('mongodb+srv://louwaikei20041014_db_user:dAkkk0M2SEDciQCo@cluster0.sg8q5q0.mongodb.net/ai-story-db?appName=Cluster0');
    console.log('数据库连接成功');

    // 查找所有用户
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    console.log(`数据库中总共有 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`- ID: ${user._id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
    });

    // 查找所有user@gmail.com用户
    const gmailUsers = users.filter(user => user.email === 'user@gmail.com');
    console.log(`\nuser@gmail.com用户数量: ${gmailUsers.length}`);
    gmailUsers.forEach(user => {
      console.log(`- ID: ${user._id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error);
    mongoose.connection.close();
  }
}

checkAllUsers();