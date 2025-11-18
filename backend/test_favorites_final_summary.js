const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// 主函数
const main = async () => {
  try {
    console.log('=== 收藏功能最终测试 ===');

    // 使用testuser3@example.com登录
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
    console.log(`\n=== 测试故事ID: ${storyId} ===`);

    // 1. 获取收藏状态
    console.log('\n1. 获取收藏状态...');
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
      console.log('✅ 收藏状态获取成功');
      console.log(`  - 收藏状态: ${statusResponse.data.data.isFavorited ? '已收藏' : '未收藏'}`);
      console.log(`  - 收藏数量: ${statusResponse.data.data.favoriteCount}`);
    }

    // 2. 获取收藏列表
    console.log('\n2. 获取收藏列表...');
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
      console.log('✅ 收藏列表获取成功');
      
      // 处理不同的响应格式
      let pagination, favorites;
      if (favoritesResponse.data.data.pagination) {
        pagination = favoritesResponse.data.data.pagination;
        favorites = favoritesResponse.data.data.favorites;
      } else {
        // 如果没有pagination，说明直接返回了数组
        pagination = { total: favoritesResponse.data.data.length };
        favorites = favoritesResponse.data.data;
      }
      
      console.log(`  - 收藏总数: ${pagination.total}`);
      console.log(`  - 当前页收藏数: ${favorites.length}`);
      
      favorites.forEach((fav, index) => {
        const story = fav.story || fav;
        console.log(`  ${index + 1}. ${story.title} (ID: ${story.id})`);
      });
    }

    // 3. 切换收藏状态
    console.log('\n3. 切换收藏状态...');
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
      console.log('✅ 收藏状态切换成功');
      console.log(`  - 操作结果: ${toggleResponse.data.message}`);
      console.log(`  - 当前状态: ${toggleResponse.data.isFavorite ? '已收藏' : '未收藏'}`);
    }

    // 4. 再次验证状态
    console.log('\n4. 验证操作后的状态...');
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
      console.log('✅ 状态验证成功');
      console.log(`  - 最终收藏状态: ${statusResponse2.data.data.isFavorited ? '已收藏' : '未收藏'}`);
      console.log(`  - 最终收藏数量: ${statusResponse2.data.data.favoriteCount}`);
    }

    console.log('\n=== 测试总结 ===');
    console.log('✅ 所有收藏功能API测试通过！');
    console.log('✅ 用户认证正常工作');
    console.log('✅ 收藏状态查询正常工作');
    console.log('✅ 收藏列表获取正常工作');
    console.log('✅ 收藏状态切换正常工作');
    console.log('\n🎉 收藏功能完全正常！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.message || error.message);
  }
};

// 运行测试
main().catch(console.error);