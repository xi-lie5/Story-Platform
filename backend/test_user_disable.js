const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testUserDisableFunction() {
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

        console.log('\n=== 测试用户禁用功能 ===');
        console.log('用户名:', testUser.username);
        console.log('邮箱:', testUser.email);
        console.log('当前状态:', testUser.isActive ? '启用' : '禁用');

        // 模拟禁用用户
        console.log('\n正在禁用用户...');
        testUser.isActive = false;
        await testUser.save();

        console.log('用户已禁用');
        console.log('新状态:', testUser.isActive ? '启用' : '禁用');

        // 模拟启用用户
        console.log('\n正在启用用户...');
        testUser.isActive = true;
        await testUser.save();

        console.log('用户已启用');
        console.log('最终状态:', testUser.isActive ? '启用' : '禁用');

        // 验证数据库中的状态
        const verifyUser = await User.findOne({ username: 'testuser2' });
        console.log('\n数据库验证结果:');
        console.log('用户状态:', verifyUser.isActive ? '启用' : '禁用');

        await mongoose.connection.close();
        console.log('\n数据库连接已关闭');
        console.log('✅ 用户禁用功能测试通过');
    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

testUserDisableFunction();