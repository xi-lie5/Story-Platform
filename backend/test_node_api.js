// 测试API配置
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  API_VERSION: 'v1',
  buildUrl(path) {
    return `${this.BASE_URL}/api/${this.API_VERSION}${path}`;
  },
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTE4YjhlZjljMmFhNWM5YmI0NjQwN2IiLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzM3NDI0MzE0LCJleHAiOjE3Mzc0Mjc5MTR9.test'
    };
  }
};

async function testNodeAPI() {
  try {
    console.log('测试节点API...');
    
    // 首先登录获取有效令牌
    console.log('\n-1. 登录获取令牌:');
    const loginResponse = await fetch(API_CONFIG.buildUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    let authToken = 'Bearer fake-test-token';
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      console.log('登录成功:', loginResult);
      if (loginResult.success && loginResult.data.token) {
        authToken = `Bearer ${loginResult.data.token}`;
        console.log('获取到有效令牌');
      }
    } else {
      console.log('登录失败，使用测试令牌');
    }
    
    // 更新认证头
    API_CONFIG.getAuthHeaders = function() {
      return {
        'Content-Type': 'application/json',
        'Authorization': authToken
      };
    };
    
    // 获取故事列表
    console.log('\n0. 获取故事列表:');
    const storiesResponse = await fetch(API_CONFIG.buildUrl('/stories'), {
      headers: API_CONFIG.getAuthHeaders()
    });
    
    if (storiesResponse.ok) {
      const storiesResult = await storiesResponse.json();
      console.log('故事列表:', storiesResult);
      
      if (storiesResult.success && storiesResult.data.stories.length > 0) {
        const storyId = storiesResult.data.stories[0]._id || storiesResult.data.stories[0].id;
        console.log('使用故事ID:', storyId);
        console.log('故事对象:', JSON.stringify(storiesResult.data.stories[0], null, 2));
        
        // 首先创建一个节点用于测试
        console.log('\n0.5. 创建测试节点:');
        const createData = {
          title: '测试节点',
          content: '这是测试内容',
          type: 'normal'
        };
        
        const createResponse = await fetch(API_CONFIG.buildUrl(`/storyNodes/stories/${storyId}/nodes`), {
          method: 'POST',
          headers: API_CONFIG.getAuthHeaders(),
          body: JSON.stringify(createData)
        });
        
        if (createResponse.ok) {
          const createResult = await createResponse.json();
          console.log('创建节点成功:', createResult);
          const testNodeId = createResult.data._id || createResult.data.id;
          console.log('测试节点ID:', testNodeId);
          
          // 测试获取创建的节点
          console.log('\n1. 测试获取创建的节点:');
          const getResponse = await fetch(API_CONFIG.buildUrl(`/storyNodes/nodes/${testNodeId}`), {
            headers: API_CONFIG.getAuthHeaders()
          });
          console.log('状态码:', getResponse.status);
          
          if (getResponse.ok) {
            const getResult = await getResponse.json();
            console.log('获取节点成功:', getResult);
          } else {
            const responseText = await getResponse.text();
            console.log('获取节点失败:', responseText);
          }
        } else {
          console.log('创建节点失败:', await createResponse.text());
        }
        
        // 测试获取不存在的节点
        console.log('\n1. 测试获取不存在的节点:');
        const getResponse = await fetch(API_CONFIG.buildUrl('/storyNodes/nodes/test123'), {
          headers: API_CONFIG.getAuthHeaders()
        });
        console.log('状态码:', getResponse.status);
        console.log('响应头:', getResponse.headers);
        
        const responseText = await getResponse.text();
        console.log('原始响应:', responseText.substring(0, 200) + '...');
        
        try {
          const getResult = JSON.parse(responseText);
          console.log('解析后的JSON:', getResult);
        } catch (e) {
          console.log('JSON解析失败:', e.message);
        }
        
        // 测试更新不存在的节点
        console.log('\n2. 测试更新不存在的节点:');
        const updateData = {
          title: '测试节点',
          content: '这是测试内容',
          type: 'normal',
          choices: []
        };
        
        const updateResponse = await fetch(API_CONFIG.buildUrl('/storyNodes/nodes/test123'), {
          method: 'PUT',
          headers: API_CONFIG.getAuthHeaders(),
          body: JSON.stringify(updateData)
        });
        const updateResult = await updateResponse.json();
        console.log('状态码:', updateResponse.status);
        console.log('响应:', updateResult);
      } else {
        console.log('没有找到故事，无法测试节点API');
      }
    } else {
      console.log('获取故事列表失败:', storiesResponse.status);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testNodeAPI();