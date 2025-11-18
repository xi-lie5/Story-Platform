const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUsersAndPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 连接数据库成功');
        
        // 查找用户
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const users = await usersCollection.find({}).toArray();
        
        console.log('\n=== 检查所有用户的密码格式 ===');
        
        for (const user of users) {
            console.log(`\n用户: ${user.email} (${user.username})`);
            console.log('密码哈希存在:', !!user.password);
            
            if (user.password) {
                console.log('密码哈希长度:', user.password.length);
                console.log('密码哈希前缀:', user.password.substring(0, 20));
                
                // 检查是否是bcrypt格式
                const isBcrypt = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
                console.log('是否为bcrypt格式:', isBcrypt);
            }
        }
        
        // 创建一个测试用户用于收藏功能测试
        console.log('\n=== 创建测试用户 ===');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const testUser = {
            email: 'testfavorites@example.com',
            username: 'testfavorites',
            password: hashedPassword,
            role: 'user',
            isDisabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // 检查是否已存在
        const existingUser = await usersCollection.findOne({ email: 'testfavorites@example.com' });
        if (existingUser) {
            console.log('测试用户已存在，跳过创建');
        } else {
            const result = await usersCollection.insertOne(testUser);
            console.log('✅ 创建测试用户成功，ID:', result.insertedId);
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📝 数据库连接已关闭');
    }
}

checkUsersAndPasswords();