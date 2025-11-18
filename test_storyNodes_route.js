// 测试storyNodes路由
// Node.js 18+ 内置fetch，无需额外导入

const BASE_URL = 'http://localhost:5000/api/v1';

async function testRoute() {
  try {
    // 首先登录
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@gmail.com',
        password: 'user123456'
      })
    });

    const loginResult = await loginResponse.json();
    if (!loginResult.success) {
      console.error('登录失败:', loginResult.message);
      return;
    }

    const token = loginResult.data.token;
    console.log('✅ 登录成功');

    // 创建一个简单的测试故事
    const storyResponse = await fetch(`${BASE_URL}/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: '测试故事',
        description: '用于测试路由的故事',
        categoryId: '69199a69fa2eb2bf6de5050e'
      })
    });

    const storyResult = await storyResponse.json();
    if (!storyResult.success) {
      console.error('创建故事失败:', storyResult.message);
      return;
    }

    const storyId = storyResult.data.id;
    console.log('✅ 故事创建成功:', storyId);

    // 创建根节点
    const rootResponse = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/root`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: '根节点',
        content: '这是根节点内容'
      })
    });

    const rootResult = await rootResponse.json();
    if (!rootResult.success) {
      console.error('创建根节点失败:', rootResult.message);
      return;
    }

    const rootNodeId = rootResult.data._id;
    console.log('✅ 根节点创建成功:', rootNodeId);

    // 测试创建选择节点
    console.log('🔀 测试创建选择节点...');
    
    const testChoices = [
      { id: 'choice_1', text: '选择1' },
      { id: 'choice_2', text: '选择2' }
    ];

    const choiceResponse = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        parentId: rootNodeId,
        title: '测试选择节点',
        content: '这是一个测试选择节点',
        type: 'choice',
        choices: testChoices
      })
    });

    console.log('📝 请求状态:', choiceResponse.status);
    console.log('📝 请求URL:', `${BASE_URL}/storyNodes/stories/${storyId}/nodes`);
    
    const choiceResult = await choiceResponse.json();
    console.log('📝 响应结果:', JSON.stringify(choiceResult, null, 2));

    if (choiceResult.success) {
      console.log('✅ 选择节点创建成功');
    } else {
      console.error('❌ 选择节点创建失败:', choiceResult.message);
      if (choiceResult.error) {
        console.error('详细错误:', choiceResult.error);
      }
    }

  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testRoute();