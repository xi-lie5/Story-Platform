const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAllUsersLogin() {
    console.log('=== 测试所有用户登录 ===');
    
    const users = [
        { email: 'user@gmail.com', password: 'password123' },
        { email: 'admin@example.com', password: 'password123' },
        { email: 'test@example.com', password: 'password123' },
        { email: 'testuser1@example.com', password: 'password123' },
        { email: 'testuser2@example.com', password: 'password123' },
        { email: 'testuser3@example.com', password: 'password123' },
        { email: 'testfavorites@example.com', password: 'password123' }
    ];
    
    for (const user of users) {
        try {
            console.log(`\n测试用户: ${user.email}`);
            const response = await axios.post(`${BASE_URL}/auth/login`, {
                email: user.email,
                password: user.password
            });
            
            if (response.data.success) {
                console.log(`✅ ${user.email} 登录成功！`);
                console.log('Token:', response.data.data.token.substring(0, 30) + '...');
                
                // 如果登录成功，测试收藏功能
                const token = response.data.data.token;
                const authHeaders = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };
                
                console.log('测试收藏功能...');
                try {
                    const favoritesResponse = await axios.get(`${BASE_URL}/interactions/user/favorites`, {
                        headers: authHeaders
                    });
                    
                    if (favoritesResponse.data.success) {
                        const favorites = favoritesResponse.data.data.favorites || [];
                        console.log(`✅ 获取收藏列表成功，收藏数量: ${favorites.length}`);
                        
                        // 测试切换收藏
                        const storyId = '691ae0687f43fdb32526f8f1';
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
                                const verifyFavorites = verifyResponse.data.data.favorites || [];
                                console.log(`✅ 验证收藏列表成功，收藏数量: ${verifyFavorites.length}`);
                            }
                        } else {
                            console.log('❌ 切换收藏失败:', toggleResponse.data.message);
                        }
                    } else {
                        console.log('❌ 获取收藏列表失败:', favoritesResponse.data.message);
                    }
                } catch (error) {
                    console.log('❌ 收藏功能测试错误:', error.response?.data || error.message);
                }
                
                return user.email; // 找到一个可用的用户就返回
            } else {
                console.log(`❌ ${user.email} 登录失败:`, response.data.message);
            }
        } catch (error) {
            console.log(`❌ ${user.email} 请求错误:`, error.response?.data || error.message);
        }
    }
    
    console.log('\n=== 所有用户登录测试完成 ===');
}

testAllUsersLogin();