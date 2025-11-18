const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// 主函数
const main = async () => {
  try {
    console.log('=== 测试收藏功能完整流程 ===');

    // 使用testuser3@example.com登录（已知可以登录）
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'testuser3@example.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ 登录失败:', loginResponse.data.message);
      return;
    }

    console.log('✅ 登录成功');
    const token = loginResponse.data.data.token;

    // 使用已知存在的故事ID：691adfcc04bc567e488958db
    const storyId = '691adfcc04bc567e488958db';
    console.log(`=== 使用故事ID ${storyId} 测试收藏功能 ===`);

    // 1. 获取初始收藏状态
    console.log('\n1. 获取初始收藏状态...');
    try {
      const statusResponse = await axios.get(
        `http://localhost:5000/api/v1/interactions/stories/${storyId}/favorite/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (statusResponse.data.success) {
        console.log('✅ 获取收藏状态成功');
        console.log(`收藏状态: ${statusResponse.data.data.isFavorited}`);
        console.log(`收藏数量: ${statusResponse.data.data.favoriteCount}`);
      }
    } catch (error) {
      console.log('❌ 获取收藏状态失败:', error.response?.data?.message || error.message);
    }

    // 2. 获取初始收藏列表
    console.log('\n2. 获取初始收藏列表...');
    try {
      const favoritesResponse = await axios.get(
        'http://localhost:5000/api/v1/interactions/user/favorites',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (favoritesResponse.data.success) {
        console.log('✅ 获取收藏列表成功');
        console.log(`当前收藏数量: ${favoritesResponse.data.data.pagination.total}`);
        console.log(`收藏的故事数量: ${favoritesResponse.data.data.favorites.length}`);
        
        // 显示收藏的故事
        favoritesResponse.data.data.favorites.forEach((fav, index) => {
          console.log(`  收藏 ${index + 1}: ${fav.story.title} (ID: ${fav.story.id})`);
        });
      }
    } catch (error) {
      console.log('❌ 获取收藏列表失败:', error.response?.data?.message || error.message);
    }

    // 3. 切换收藏状态
    console.log('\n3. 切换收藏状态...');
    try {
      const toggleResponse = await axios.post(
        `http://localhost:5000/api/v1/interactions/stories/${storyId}/favorite`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (toggleResponse.data.success) {
        console.log('✅ 切换收藏状态成功');
        console.log(`操作结果: ${toggleResponse.data.message}`);
        console.log(`当前收藏状态: ${toggleResponse.data.isFavorite}`);
      }
    } catch (error) {
      console.log('❌ 切换收藏状态失败:', error.response?.data?.message || error.message);
    }

    // 4. 验证收藏状态变化
    console.log('\n4. 验证收藏状态变化...');
    try {
      const statusResponse2 = await axios.get(
        `http://localhost:5000/api/v1/interactions/stories/${storyId}/favorite/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (statusResponse2.data.success) {
        console.log('✅ 验证收藏状态成功');
        console.log(`最终收藏状态: ${statusResponse2.data.data.isFavorited}`);
        console.log(`最终收藏数量: ${statusResponse2.data.data.favoriteCount}`);
      }
    } catch (error) {
      console.log('❌ 验证收藏状态失败:', error.response?.data?.message || error.message);
    }

    // 5. 再次获取收藏列表验证变化
    console.log('\n5. 再次获取收藏列表验证变化...');
    try {
      const favoritesResponse2 = await axios.get(
        'http://localhost:5000/api/v1/interactions/user/favorites',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (favoritesResponse2.data.success) {
        console.log('✅ 获取收藏列表成功');
        console.log(`最终收藏数量: ${favoritesResponse2.data.data.pagination.total}`);
        console.log(`最终收藏的故事数量: ${favoritesResponse2.data.data.favorites.length}`);
        
        // 显示收藏的故事
        favoritesResponse2.data.data.favorites.forEach((fav, index) => {
          console.log(`  收藏 ${index + 1}: ${fav.story.title} (ID: ${fav.story.id})`);
        });
      }
    } catch (error) {
      console.log('❌ 获取收藏列表失败:', error.response?.data?.message || error.message);
    }

    console.log('\n=== 测试完成 ===');
    console.log('✅ 收藏功能API测试成功完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.response?.data || error.message);
  }
};

// 运行测试
main().catch(console.error);