// 完整的节点编辑API测试
// 使用Node.js 18+内置的fetch

const BASE_URL = 'http://localhost:5000/api/v1';

async function testNodeEditAPI() {
    try {
        console.log('🚀 开始节点编辑API测试...\n');
        
        // 第一步：登录
        console.log('🔐 正在登录...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ 登录失败，尝试其他用户...');
            // 尝试其他用户
            const altLoginResponse = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'test123'
                })
            });
            
            if (!altLoginResponse.ok) {
                throw new Error('所有用户登录失败');
            }
            
            var loginData = await altLoginResponse.json();
        } else {
            var loginData = await loginResponse.json();
        }
        
        console.log('✅ 登录成功');
        const token = loginData.data.token;
        console.log('   当前用户:', loginData.data.username);
        console.log('   用户ID:', loginData.data.userId);
        
        // 第二步：获取故事列表
        console.log('\n📚 获取故事列表...');
        const storiesResponse = await fetch(`${BASE_URL}/stories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!storiesResponse.ok) {
            throw new Error('获取故事列表失败');
        }
        
        const storiesData = await storiesResponse.json();
        console.log('   获取到的故事数量:', storiesData.data.stories.length);
        
        // 找到属于当前用户的故事
        const currentUserId = loginData.data.userId;
        const userStories = storiesData.data.stories.filter(story => 
            story.author.id === currentUserId
        );
        
        let story;
        
        if (userStories.length === 0) {
            console.log('❌ 没有找到属于当前用户的故事');
            console.log('   尝试创建一个新故事...');
            
            // 创建新故事
            const createStoryResponse = await fetch(`${BASE_URL}/stories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: '测试故事 - ' + new Date().toLocaleTimeString(),
                    description: '用于测试节点编辑功能的故事',
                    categoryId: '69199a69fa2eb2bf6de5050e' // 使用现有分类ID
                })
            });
            
            if (!createStoryResponse.ok) {
                const errorData = await createStoryResponse.json();
                console.log('❌ 创建故事失败:', errorData.message);
                throw new Error('创建故事失败');
            }
            
            const createStoryData = await createStoryResponse.json();
            story = createStoryData.data;
            console.log('✅ 新故事创建成功:', story.title);
        } else {
            story = userStories[0];
            console.log('✅ 找到用户故事:', story.title);
            console.log('   故事ID:', story.id);
            console.log('   故事对象:', JSON.stringify(story, null, 2));
        }
        
        // 第三步：获取节点列表
        console.log('\n🔍 获取节点列表...');
        const storyId = story.id || story._id;
        console.log('   使用故事ID:', storyId);
        
        const nodesResponse = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/nodes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!nodesResponse.ok) {
            const errorText = await nodesResponse.text();
            console.log('❌ 获取节点列表失败，状态码:', nodesResponse.status);
            console.log('❌ 错误响应:', errorText);
            throw new Error('获取节点列表失败');
        }
        
        const nodesData = await nodesResponse.json();
        let node;
        
        if (nodesData.data.length === 0) {
            console.log('❌ 没有找到节点，尝试创建根节点...');
            
            // 创建根节点
            const createRootResponse = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/root`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: '故事开始',
                    content: '这是故事的开始节点...'
                })
            });
            
            if (!createRootResponse.ok) {
                const errorData = await createRootResponse.json();
                console.log('❌ 创建根节点失败:', errorData.message);
                throw new Error('创建根节点失败');
            }
            
            const createRootData = await createRootResponse.json();
            node = createRootData.data;
            console.log('✅ 根节点创建成功:', node.title);
        } else {
            node = nodesData.data[0];
            console.log('✅ 找到节点:', node.title);
            console.log('   原内容:', node.content.substring(0, 50) + '...');
            console.log('   原选项数量:', node.choices ? node.choices.length : 0);
        }
        
        // 第四步：更新节点
        console.log('\n📝 更新节点...');
        const updateData = {
            title: 'API更新后的节点 - ' + new Date().toLocaleTimeString(),
            content: '这是通过API更新的内容。测试时间：' + new Date().toLocaleString(),
            type: 'choice',
            choices: [
                { id: 'choice1', text: 'API选项A - 探索未知', targetNodeId: null },
                { id: 'choice2', text: 'API选项B - 寻求答案', targetNodeId: null },
                { id: 'choice3', text: 'API选项C - 返回起点', targetNodeId: null },
                { id: 'choice4', text: 'API选项D - 深入冒险', targetNodeId: null }
            ],
            metadata: {
                difficulty: 'medium',
                estimatedTime: '5-7 minutes',
                lastModified: new Date().toISOString()
            }
        };
        
        const updateResponse = await fetch(`${BASE_URL}/storyNodes/nodes/${node._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`更新节点失败: ${errorData.message || updateResponse.statusText}`);
        }
        
        const updateResult = await updateResponse.json();
        console.log('✅ 节点更新成功');
        console.log('   新标题:', updateResult.data.title);
        console.log('   新内容长度:', updateResult.data.content.length);
        console.log('   新选项数量:', updateResult.data.choices.length);
        
        // 第五步：验证更新结果
        console.log('\n🔍 验证更新结果...');
        const verifyResponse = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/nodes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!verifyResponse.ok) {
            const errorText = await verifyResponse.text();
            console.log('❌ 验证失败，状态码:', verifyResponse.status);
            console.log('❌ 错误响应:', errorText);
            throw new Error('验证更新结果失败');
        }
        
        const verifyData = await verifyResponse.json();
        const updatedNode = verifyData.data.find(n => n._id === node._id);
        
        if (!updatedNode) {
            throw new Error('在节点列表中找不到更新的节点');
        }
        
        console.log('✅ 验证成功');
        console.log('   标题:', updatedNode.title);
        console.log('   内容:', updatedNode.content.substring(0, 100) + '...');
        console.log('   类型:', updatedNode.type);
        console.log('   选项数量:', updatedNode.choices.length);
        
        updatedNode.choices.forEach((choice, index) => {
            console.log(`   选项${index + 1}: ${choice.text}`);
        });
        
        console.log('\n🎉 节点编辑API测试完全成功！');
        console.log('✅ 所有功能正常工作：认证、获取数据、更新节点、验证结果');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('详细错误:', error);
    }
}

testNodeEditAPI();