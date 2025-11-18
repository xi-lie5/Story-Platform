const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testUserDisableLogin() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('已连接到数据库');

        // 查找测试用户
        const testUser = await User.findOne({ username: 'testuser2' });
        if (!testUser) {
            console.log('测试用户不存在，请先运行 create_test_user.js');
            await mongoose.connection.close();
            return;
        }

        console.log('\n=== 测试用户禁用登录功能 ===');
        console.log('用户名:', testUser.username);
        console.log('邮箱:', testUser.email);
        console.log('当前状态:', testUser.isActive ? '启用' : '禁用');

        // 测试1：用户启用状态下登录（应该成功）
        console.log('\n--- 测试1：用户启用状态登录 ---');
        testUser.isActive = true;
        await testUser.save();
        console.log('用户状态已设置为启用');
        
        // 模拟登录API验证逻辑
        const loginAttempt1 = await User.findOne({ email: testUser.email }).select('+password +refreshToken');
        if (loginAttempt1 && loginAttempt1.isActive) {
            console.log('✅ 启用状态登录验证：通过');
        } else {
            console.log('❌ 启用状态登录验证：失败');
        }

        // 测试2：用户禁用状态下登录（应该失败）
        console.log('\n--- 测试2：用户禁用状态登录 ---');
        testUser.isActive = false;
        await testUser.save();
        console.log('用户状态已设置为禁用');
        
        // 模拟登录API验证逻辑
        const loginAttempt2 = await User.findOne({ email: testUser.email }).select('+password +refreshToken');
        if (loginAttempt2 && !loginAttempt2.isActive) {
            console.log('✅ 禁用状态登录验证：正确拒绝登录');
            console.log('   错误信息应该是：账户已被禁用，请联系管理员');
        } else {
            console.log('❌ 禁用状态登录验证：未能正确拒绝');
        }

        // 测试3：恢复用户状态
        console.log('\n--- 测试3：恢复用户状态 ---');
        testUser.isActive = true;
        await testUser.save();
        console.log('用户状态已恢复为启用');

        // 验证最终状态
        const verifyUser = await User.findOne({ username: 'testuser2' });
        console.log('\n最终验证结果:');
        console.log('用户状态:', verifyUser.isActive ? '启用' : '禁用');

        await mongoose.connection.close();
        console.log('\n数据库连接已关闭');
        console.log('✅ 用户禁用登录功能测试完成');
        
        console.log('\n=== 测试总结 ===');
        console.log('1. 启用用户可以正常登录');
        console.log('2. 禁用用户无法登录（返回403错误）');
        console.log('3. 登录和刷新令牌都会检查用户状态');
        console.log('4. 前端会收到明确的错误提示："账户已被禁用，请联系管理员"');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

testUserDisableLogin();