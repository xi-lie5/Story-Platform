require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.execute(
      'SELECT id, username, email FROM users WHERE email = ?',
      ['admin@storyforge.com']
    );
    
    if (users.length === 0) {
      console.log('❌ 管理员账户不存在！');
      return;
    }
    
    const admin = users[0];
    const newPassword = 'admin123456';
    
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码并重置登录尝试次数和锁定状态
    await connection.execute(
      'UPDATE users SET password = ?, login_attempts = 0, lock_until = NULL, token_version = token_version + 1 WHERE id = ?',
      [hashedPassword, admin.id]
    );
    
    console.log('✅ 管理员密码重置成功！');
    console.log('用户名:', admin.username);
    console.log('邮箱:', admin.email);
    console.log('新密码:', newPassword);
    console.log('登录尝试次数已重置为 0');
    console.log('账户锁定状态已清除');
    console.log('Token版本已更新（所有现有token已失效）');
    
  } catch (error) {
    console.error('重置密码失败:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

resetAdminPassword();
