const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testFavoritesFlow() {
    console.log('=== 开始测试收藏功能 ===');
    
    try {
        // 1. 登录
        console.log('\n1. 测试登录...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test849@example.com',
            password: 'password123'
        });
        
        if (loginResponse.data.success) {
            const token = loginResponse.data.data.token;
            console.log('✅ 登录成功，Token:', token.substring(0, 30) + '...');
            
            const authHeaders = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            // 2. 获取收藏列表
            console.log('\n2. 获取收藏列表...');
            try {
                const favoritesResponse = await axios.get(`${BASE_URL}/interactions/user/favorites`, {
                    headers: authHeaders
                });
                
                if (favoritesResponse.data.success) {
                    const favorites = favoritesResponse.data.data.favorites || [];
                    console.log('✅ 获取收藏列表成功，收藏数量:', favorites.length);
                    console.log('收藏列表:', JSON.stringify(favorites, null, 2));
                } else {
                    console.log('❌ 获取收藏列表失败:', favoritesResponse.data.message);
                }
            } catch (error) {
                console.log('❌ 获取收藏列表错误:', error.response?.data || error.message);
            }
            
            // 3. 切换收藏状态
            console.log('\n3. 切换收藏状态...');
            const storyId = '691ae0687f43fdb32526f8f1';
            try {
                const toggleResponse = await axios.post(`${BASE_URL}/interactions/stories/${storyId}/favorite`, {}, {
                    headers: authHeaders
                });
                
                if (toggleResponse.data.success) {
                    const action = toggleResponse.data.data.isFavorited ? '收藏' : '取消收藏';
                    console.log('✅', action + '成功');
                    console.log('响应:', JSON.stringify(toggleResponse.data, null, 2));
                } else {
                    console.log('❌ 切换收藏失败:', toggleResponse.data.message);
                }
            } catch (error) {
                console.log('❌ 切换收藏错误:', error.response?.data || error.message);
            }
            
            // 4. 再次获取收藏列表验证
            console.log('\n4. 验证收藏状态...');
            try {
                const favoritesResponse2 = await axios.get(`${BASE_URL}/interactions/user/favorites`, {
                    headers: authHeaders
                });
                
                if (favoritesResponse2.data.success) {
                    const favorites2 = favoritesResponse2.data.data.favorites || [];
                    console.log('✅ 验证收藏列表成功，收藏数量:', favorites2.length);
                    console.log('收藏列表:', JSON.stringify(favorites2, null, 2));
                } else {
                    console.log('❌ 验证收藏列表失败:', favoritesResponse2.data.message);
                }
            } catch (error) {
                console.log('❌ 验证收藏列表错误:', error.response?.data || error.message);
            }
            
        } else {
            console.log('❌ 登录失败:', loginResponse.data.message);
        }
        
    } catch (error) {
        console.log('❌ 测试过程中发生错误:', error.response?.data || error.message);
    }
    
    console.log('\n=== 收藏功能测试完成 ===');
}

// 运行测试
testFavoritesFlow();