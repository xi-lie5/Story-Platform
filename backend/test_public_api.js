const axios = require('axios');

async function testPublicStoriesAPI() {
  try {
    console.log('🧪 测试公共故事API端点...\n');

    // 测试新的public端点
    console.log('1. 测试 GET /api/v1/stories/public');
    const publicResponse = await axios.get('http://localhost:5000/api/v1/stories/public');
    
    if (publicResponse.data.success) {
      console.log('✅ API调用成功');
      console.log(`📊 返回数据: ${JSON.stringify(publicResponse.data.data, null, 2)}`);
      
      const stories = publicResponse.data.data.stories;
      console.log(`\n📚 找到 ${stories.length} 个公共故事:`);
      stories.forEach((story, index) => {
        console.log(`${index + 1}. ${story.title} - ${story.author.username}`);
      });
    } else {
      console.log('❌ API调用失败:', publicResponse.data.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testPublicStoriesAPI();