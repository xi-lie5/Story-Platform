const mongoose = require('mongoose');
require('dotenv').config();

// 模拟admin页面禁用用户的API调用
async function testAdminDisableUser() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');

    const User = require('./models/User');

    // 查找测试用户
    const user = await User.findOne({ email: 'testuser2@example.com' });
    if (!user) {
      console.log('未找到测试用户');
      return;
    }

    console.log('\n=== 禁用前状态 ===');
    console.log('用户ID:', user.id);
    console.log('邮箱:', user.email);
    console.log('用户名:', user.username);
    console.log('isActive状态:', user.isActive);

    // 模拟admin API的禁用操作
    console.log('\n=== 执行禁用操作 ===');
    user.isActive = false;
    await user.save();

    console.log('用户已被禁用');

    // 验证禁用后的状态
    console.log('\n=== 禁用后状态 ===');
    const disabledUser = await User.findOne({ email: 'testuser2@example.com' });
    console.log('isActive状态:', disabledUser.isActive);
    console.log('更新时间:', disabledUser.updatedAt);

    // 测试登录验证
    console.log('\n=== 测试登录验证 ===');
    if (!disabledUser.isActive) {
      console.log('❌ 登录验证：用户已被禁用，应该拒绝登录');
    } else {
      console.log('✅ 登录验证：用户状态正常，可以登录');
    }

    // 恢复用户状态
    console.log('\n=== 恢复用户状态 ===');
    disabledUser.isActive = true;
    await disabledUser.save();
    console.log('用户状态已恢复为启用');

    // 最终验证
    const finalUser = await User.findOne({ email: 'testuser2@example.com' });
    console.log('最终isActive状态:', finalUser.isActive);

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

testAdminDisableUser();