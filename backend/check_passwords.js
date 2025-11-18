const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');

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
                
                // 测试密码验证
                try {
                    const isValid = await bcrypt.compare('password123', user.password);
                    console.log('密码 "password123" 验证结果:', isValid);
                    
                    if (!isValid) {
                        // 尝试其他常见密码
                        const passwords = ['123456', 'password', 'admin', 'test'];
                        for (const pwd of passwords) {
                            const valid = await bcrypt.compare(pwd, user.password);
                            if (valid) {
                                console.log(`✅ 找到正确密码: "${pwd}"`);
                                break;
                            }
                        }
                    }
                } catch (error) {
                    console.log('密码验证错误:', error.message);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📝 数据库连接已关闭');
    }
}

checkUsersAndPasswords();