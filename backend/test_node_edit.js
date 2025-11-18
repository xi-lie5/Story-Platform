// Node.js 18+ 内置fetch，无需导入

// 配置
const BASE_URL = 'http://localhost:5000';
let authToken = '';

// 登录获取token
async function login() {
    console.log('🔐 正在登录...');
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
        })
    });
    
    const data = await response.json();
    if (data.success) {
        authToken = data.token;
        console.log('✅ 登录成功');
        return true;
    } else {
        console.error('❌ 登录失败:', data.message);
        return false;
    }
}

// 创建测试故事
async function createTestStory() {
    console.log('📖 创建测试故事...');
    const response = await fetch(`${BASE_URL}/api/v1/stories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            title: '测试编辑功能的故事',
            description: '用于测试节点编辑功能的故事',
            genre: '奇幻',
            tags: ['测试', '编辑']
        })
    });
    
    const data = await response.json();
    if (data.success) {
        console.log('✅ 故事创建成功:', data.data._id);
        return data.data._id;
    } else {
        console.error('❌ 故事创建失败:', data.message);
        return null;
    }
}

// 创建根节点
async function createRootNode(storyId) {
    console.log('🌱 创建根节点...');
    const response = await fetch(`${BASE_URL}/api/v1/storyNodes/stories/${storyId}/root`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            title: '故事开始',
            content: '这是故事的开始，你站在一个十字路口...'
        })
    });
    
    const data = await response.json();
    if (data.success) {
        console.log('✅ 根节点创建成功:', data.data._id);
        return data.data._id;
    } else {
        console.error('❌ 根节点创建失败:', data.message);
        return null;
    }
}

// 创建选择节点
async function createChoiceNode(storyId, parentId) {
    console.log('🔀 创建选择节点...');
    const response = await fetch(`${BASE_URL}/api/v1/storyNodes/stories/${storyId}/nodes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            parentId: parentId,
            title: '选择你的道路',
            content: '你面临一个重要的选择...',
            type: 'choice',
            choices: [
                { id: 'choice1', text: '向左走', targetNodeId: null },
                { id: 'choice2', text: '向右走', targetNodeId: null }
            ]
        })
    });
    
    const data = await response.json();
    if (data.success) {
        console.log('✅ 选择节点创建成功:', data.data._id);
        return data.data._id;
    } else {
        console.error('❌ 选择节点创建失败:', data.message);
        return null;
    }
}

// 测试节点编辑功能
async function testNodeEdit(nodeId) {
    console.log('✏️ 测试节点编辑功能...');
    
    // 测试1: 更新节点基本信息
    console.log('📝 测试1: 更新节点基本信息');
    const updateResponse = await fetch(`${BASE_URL}/api/v1/storyNodes/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            title: '更新后的标题',
            content: '这是更新后的内容，更加丰富和详细...',
            type: 'choice'
        })
    });
    
    const updateData = await updateResponse.json();
    if (updateData.success) {
        console.log('✅ 节点基本信息更新成功');
        console.log('   新标题:', updateData.data.title);
        console.log('   新内容长度:', updateData.data.content.length);
    } else {
        console.error('❌ 节点基本信息更新失败:', updateData.message);
    }
    
    // 测试2: 更新节点的选项
    console.log('📝 测试2: 更新节点选项');
    const choicesUpdateResponse = await fetch(`${BASE_URL}/api/v1/storyNodes/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            choices: [
                { id: 'choice1', text: '勇敢地向前走', targetNodeId: null },
                { id: 'choice2', text: '谨慎地观察四周', targetNodeId: null },
                { id: 'choice3', text: '回头寻找其他路径', targetNodeId: null }
            ]
        })
    });
    
    const choicesUpdateData = await choicesUpdateResponse.json();
    if (choicesUpdateData.success) {
        console.log('✅ 节点选项更新成功');
        console.log('   选项数量:', choicesUpdateData.data.choices.length);
        choicesUpdateData.data.choices.forEach((choice, index) => {
            console.log(`   选项${index + 1}: ${choice.text}`);
        });
    } else {
        console.error('❌ 节点选项更新失败:', choicesUpdateData.message);
    }
    
    // 测试3: 获取节点信息验证更新
    console.log('📝 测试3: 验证节点更新结果');
    const getResponse = await fetch(`${BASE_URL}/api/v1/storyNodes/nodes/${nodeId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });
    
    const getData = await getResponse.json();
    if (getData.success) {
        console.log('✅ 节点信息获取成功');
        console.log('   最终标题:', getData.data.title);
        console.log('   最终内容:', getData.data.content.substring(0, 50) + '...');
        console.log('   最终选项数量:', getData.data.choices.length);
    } else {
        console.error('❌ 节点信息获取失败:', getData.message);
    }
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始节点编辑功能测试...\n');
    
    // 登录
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('❌ 测试失败：无法登录');
        return;
    }
    
    // 创建测试故事
    const storyId = await createTestStory();
    if (!storyId) {
        console.log('❌ 测试失败：无法创建故事');
        return;
    }
    
    // 创建根节点
    const rootNodeId = await createRootNode(storyId);
    if (!rootNodeId) {
        console.log('❌ 测试失败：无法创建根节点');
        return;
    }
    
    // 创建选择节点
    const choiceNodeId = await createChoiceNode(storyId, rootNodeId);
    if (!choiceNodeId) {
        console.log('❌ 测试失败：无法创建选择节点');
        return;
    }
    
    // 测试节点编辑功能
    await testNodeEdit(choiceNodeId);
    
    console.log('\n🎉 节点编辑功能测试完成！');
}

// 运行测试
runTests().catch(console.error);