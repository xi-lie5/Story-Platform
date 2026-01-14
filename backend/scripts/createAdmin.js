const User = require('../models/User');
const { pool } = require('../config/database');

async function createAdmin() {
  const connection = await pool.getConnection();
  try {
    // 检查管理员是否已存在
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('管理员账户已存在，用户名: admin');
      return;
    }

    // 创建管理员账户
    const admin = await User.create({
      username: 'admin',
      email: 'admin@storyforge.com',
      password: 'admin123456', // 默认密码，建议首次登录后修改
      role: 'admin',
      bio: '系统管理员'
    });

    console.log('管理员账户创建成功！');
    console.log('用户名: admin');
    console.log('邮箱: admin@storyforge.com');
    console.log('密码: admin123456');
    console.log('请首次登录后立即修改密码！');
  } catch (error) {
    console.error('创建管理员账户失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

createAdmin();
