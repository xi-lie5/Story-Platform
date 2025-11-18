const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('已连接到数据库');

        // 检查是否已存在测试用户
        const existingUser = await User.findOne({ username: 'testuser2' });
        if (existingUser) {
            console.log('测试用户已存在');
            await mongoose.connection.close();
            return;
        }

        // 创建测试用户
        const testUser = new User({
            username: 'testuser2',
            email: 'testuser2@example.com',
            password: 'password123',
            role: 'user',
            isActive: true
        });

        await testUser.save();
        console.log('测试用户创建成功');
        console.log('用户名:', testUser.username);
        console.log('邮箱:', testUser.email);
        console.log('状态:', testUser.isActive ? '启用' : '禁用');

        await mongoose.connection.close();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('创建测试用户失败:', error);
        process.exit(1);
    }
}

createTestUser();