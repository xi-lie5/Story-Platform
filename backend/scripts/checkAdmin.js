require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.execute(
      'SELECT id, username, email, password, is_active, login_attempts, lock_until, role FROM users WHERE email = ?',
      ['admin@storyforge.com']
    );
    
    if (users.length === 0) {
      console.log('❌ 管理员账户不存在！');
      return;
    }
    
    const admin = users[0];
    console.log('管理员账户信息:');
    console.log('  ID:', admin.id);
    console.log('  用户名:', admin.username);
    console.log('  邮箱:', admin.email);
    console.log('  角色:', admin.role);
    console.log('  是否激活:', admin.is_active ? '是' : '否');
    console.log('  登录尝试次数:', admin.login_attempts || 0);
    console.log('  锁定到期时间:', admin.lock_until || '未锁定');
    
    // 检查是否被锁定
    if (admin.lock_until) {
      const lockTime = new Date(admin.lock_until);
      const now = new Date();
      if (lockTime > now) {
        const remainingMinutes = Math.ceil((lockTime - now) / 1000 / 60);
        console.log('  ⚠️  账户已被锁定，剩余时间:', remainingMinutes, '分钟');
      } else {
        console.log('  ✅ 锁定时间已过期，可以登录');
      }
    }
    
    // 测试密码
    const testPassword = 'admin123456';
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('  密码验证结果:', isMatch ? '✅ 密码正确' : '❌ 密码错误');
    
    // 如果账户被锁定，提供解锁选项
    if (admin.lock_until && new Date(admin.lock_until) > new Date()) {
      console.log('\n建议：执行以下SQL解锁账户:');
      console.log(`UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ${admin.id};`);
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

checkAdmin();
