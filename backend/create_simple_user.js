// 创建简单测试用户
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story')
    .then(() => console.log('✅ 数据库连接成功'))
    .catch(err => console.error('❌ 数据库连接失败:', err));

async function createSimpleUser() {
    try {
        // 删除所有现有用户
        await User.deleteMany({});
        console.log('🗑️ 清除所有现有用户');
        
        // 手动哈希密码
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔐 密码哈希完成:', hashedPassword.substring(0, 20) + '...');
        
        // 直接创建用户，绕过模型的pre-save钩子
        const userData = {
            username: 'test',
            email: 'test@test.com',
            password: hashedPassword,
            role: 'admin'
        };
        
        const testUser = await User.create(userData);
        
        // 验证密码
        const isMatch = await bcrypt.compare('123456', testUser.password);
        console.log('🔍 密码验证结果:', isMatch);

        console.log('✅ 新测试用户创建成功');
        console.log('   邮箱:', testUser.email);
        console.log('   用户名:', testUser.username);
        console.log('   密码: 123456');
        console.log('   角色:', testUser.role);
    } catch (error) {
        console.error('❌ 创建用户失败:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

createSimpleUser();