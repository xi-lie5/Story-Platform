const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 连接数据库成功');
        
        // 查找用户
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ email: 'test849@example.com' });
        
        if (user) {
            console.log('✅ 找到用户:');
            console.log('ID:', user._id);
            console.log('邮箱:', user.email);
            console.log('用户名:', user.username);
            console.log('是否禁用:', user.isDisabled || false);
            console.log('密码哈希存在:', !!user.password);
            console.log('密码哈希长度:', user.password ? user.password.length : 0);
            
            // 检查密码格式
            if (user.password) {
                console.log('密码哈希前缀:', user.password.substring(0, 10));
            }
        } else {
            console.log('❌ 未找到用户 test849@example.com');
            
            // 列出所有用户
            const allUsers = await usersCollection.find({}).toArray();
            console.log('\n数据库中的所有用户:');
            allUsers.forEach((u, index) => {
                console.log(`${index + 1}. ${u.email} (${u.username})`);
            });
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('📝 数据库连接已关闭');
    }
}

checkUser();