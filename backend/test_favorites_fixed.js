const mongoose = require('mongoose');
const axios = require('axios');
const Story = require('./models/Story');

// 数据库连接
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story');
    console.log('✅ 连接数据库成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

// 主函数
const main = async () => {
  await connectDB();

  try {
    // 查找真实的故事
    const stories = await Story.find({}).limit(3);
    
    if (stories.length === 0) {
      console.log('❌ 没有找到任何故事');
      return;
    }

    console.log('=== 找到故事 ===');
    stories.forEach((story, index) => {
      console.log(`故事 ${index + 1}:`);
      console.log(`ID: ${story._id}`);
      console.log(`标题: ${story.title}`);
      console.log(`作者: ${story.author}`);
      console.log(`状态: ${story.status}`);
      console.log('---');
    });

    const storyId = stories[0]._id.toString();
    console.log(`=== 使用故事ID ${storyId} 测试收藏功能 ===`);

    // 使用testuser3@example.com登录（已知可以登录）
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'testuser3@example.com',
      password: 'password123'
    });

    if (loginResponse.data.success) {
      console.log('✅ 登录成功');
      const token = loginResponse.data.data.token;

      // 测试获取收藏状态
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

        console.log('✅ 获取收藏状态成功:');
        console.log('响应结构:', JSON.stringify(statusResponse.data, null, 2));
        
        if (statusResponse.data.success && statusResponse.data.data) {
          console.log(`收藏状态: ${statusResponse.data.data.isFavorited}`);
          console.log(`收藏数量: ${statusResponse.data.data.favoriteCount}`);
        }
      } catch (error) {
        console.log('❌ 获取收藏状态失败:', error.response?.data || error.message);
      }

      // 测试切换收藏状态
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

        console.log('✅ 切换收藏状态成功:');
        console.log('响应结构:', JSON.stringify(toggleResponse.data, null, 2));
        console.log(`收藏状态: ${toggleResponse.data.isFavorite}`);
      } catch (error) {
        console.log('❌ 切换收藏状态失败:', error.response?.data || error.message);
      }

      // 再次获取收藏状态验证
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

        console.log('✅ 验证收藏状态:');
        console.log('响应结构:', JSON.stringify(statusResponse2.data, null, 2));
        
        if (statusResponse2.data.success && statusResponse2.data.data) {
          console.log(`最终收藏状态: ${statusResponse2.data.data.isFavorited}`);
          console.log(`最终收藏数量: ${statusResponse2.data.data.favoriteCount}`);
        }
      } catch (error) {
        console.log('❌ 验证收藏状态失败:', error.response?.data || error.message);
      }

      // 测试获取收藏列表
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

        console.log('✅ 获取收藏列表成功:');
        console.log('响应结构:', JSON.stringify(favoritesResponse.data, null, 2));
        
        if (favoritesResponse.data.success && favoritesResponse.data.data) {
          console.log(`收藏数量: ${favoritesResponse.data.data.pagination.total}`);
          console.log(`收藏的故事: ${favoritesResponse.data.data.favorites.length} 个`);
        }
      } catch (error) {
        console.log('❌ 获取收藏列表失败:', error.response?.data || error.message);
      }

    } else {
      console.log('❌ 登录失败');
    }

  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
  } finally {
    await mongoose.connection.close();
    console.log('📝 数据库连接已关闭');
  }
};

// 运行测试
main().catch(console.error);