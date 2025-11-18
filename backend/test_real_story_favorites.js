const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

async function findExistingStories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 连接数据库成功');
        
        // 查找故事
        const db = mongoose.connection.db;
        const storiesCollection = db.collection('stories');
        
        const stories = await storiesCollection.find({}).limit(5).toArray();
        
        console.log('\n=== 找到故事 ===');
        if (stories.length === 0) {
            console.log('❌ 数据库中没有故事');
        } else {
            stories.forEach((story, index) => {
                console.log(`\n故事 ${index + 1}:`);
                console.log('ID:', story._id);
                console.log('标题:', story.title || '无标题');
                console.log('作者:', story.author || '未知作者');
                console.log('状态:', story.status || '未知状态');
            });
        }
        
        // 使用第一个故事ID测试完整收藏功能
        if (stories.length > 0) {
            const storyId = stories[0]._id.toString();
            console.log(`\n=== 使用故事ID ${storyId} 测试收藏功能 ===`);
            
            const axios = require('axios');
            const BASE_URL = 'http://localhost:5000/api/v1';
            
            // 登录获取token
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'testuser3@example.com',
                password: 'password123'
            });
            
            if (loginResponse.data.success) {
                const token = loginResponse.data.data.token;
                const authHeaders = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };
                
                console.log('✅ 登录成功');
                
                // 获取初始收藏列表
                const initialFavoritesResponse = await axios.get(`${BASE_URL}/interactions/user/favorites`, {
                    headers: authHeaders
                });
                
                if (initialFavoritesResponse.data.success) {
                    const initialCount = (initialFavoritesResponse.data.data.favorites || []).length;
                    console.log(`初始收藏数量: ${initialCount}`);
                }
                
                // 切换收藏状态
                const toggleResponse = await axios.post(`${BASE_URL}/interactions/stories/${storyId}/favorite`, {}, {
                    headers: authHeaders
                });
                
                if (toggleResponse.data.success) {
                    const action = toggleResponse.data.data.isFavorited ? '收藏' : '取消收藏';
                    console.log(`✅ ${action}成功！`);
                    
                    // 验证收藏状态
                    const verifyResponse = await axios.get(`${BASE_URL}/interactions/user/favorites`, {
                        headers: authHeaders
                    });
                    
                    if (verifyResponse.data.success) {
                        const finalCount = (verifyResponse.data.data.favorites || []).length;
                        console.log(`✅ 验证收藏列表成功，收藏数量: ${finalCount}`);
                        
                        // 显示收藏列表
                        const favorites = verifyResponse.data.data.favorites || [];
                        console.log('收藏列表:');
                        favorites.forEach((fav, index) => {
                            console.log(`${index + 1}. ${fav.story?.title || fav.storyId} (收藏时间: ${fav.createdAt})`);
                        });
                        
                        console.log('\n🎉 收藏功能完全正常工作！');
                    }
                } else {
                    console.log('❌ 切换收藏失败:', toggleResponse.data.message);
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

findExistingStories();