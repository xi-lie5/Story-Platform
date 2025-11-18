// Node.js 18+ 内置fetch，无需额外导入

// 配置
const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';
let storyId = '';
let rootNodeId = '';

// 登录获取token
async function login() {
  console.log('🔐 正在登录...');
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@gmail.com',
        password: 'user123456'
      })
    });

    const result = await response.json();
    if (result.success) {
      authToken = result.data.token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.error('❌ 登录失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录错误:', error.message);
    return false;
  }
}

// 创建故事
async function createStory() {
  console.log('📚 正在创建故事...');
  try {
    const response = await fetch(`${BASE_URL}/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: '森林冒险',
        description: '一个关于选择的简单冒险故事，展示交互式叙事的魅力。',
        categoryId: '69199a69fa2eb2bf6de5050e'
      })
    });

    const result = await response.json();
    if (result.success) {
      storyId = result.data.id;
      console.log('✅ 故事创建成功:', storyId);
      return true;
    } else {
      console.error('❌ 创建故事失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 创建故事错误:', error.message);
    return false;
  }
}

// 创建根节点
async function createRootNode() {
  console.log('🌱 正在创建根节点...');
  try {
    const response = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/root`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: '森林的开始',
        content: '你站在一片茂密森林的入口，阳光透过树叶洒下斑驳的光影。你感到既兴奋又紧张，因为你知道这片森林中充满了未知的选择和冒险。微风吹过，带来树叶的沙沙声，仿佛在召唤你进入这个神秘的世界。'
      })
    });

    const result = await response.json();
    if (result.success) {
      rootNodeId = result.data._id; // 使用 _id 而不是 id
      console.log('✅ 根节点创建成功:', rootNodeId);
      return true;
    } else {
      console.error('❌ 创建根节点失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 创建根节点错误:', error.message);
    return false;
  }
}

// 创建选择节点
async function createChoiceNode(parentId, title, content, choices) {
  console.log(`🔀 正在创建选择节点: ${title}`);
  console.log('📝 发送的choices数据:', JSON.stringify(choices, null, 2));
  try {
    const requestBody = {
      parentId: parentId,
      title: title,
      content: content,
      type: 'choice',
      choices: choices
    };
    console.log('📝 完整请求体:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ 选择节点创建成功:', result.data._id);
      return result.data._id;
    } else {
      console.error('❌ 创建选择节点失败:', result.message);
      console.error('详细错误信息:', result.error || '无');
      return null;
    }
  } catch (error) {
    console.error('❌ 创建选择节点错误:', error.message);
    return null;
  }
}

// 创建分支节点
async function createBranchNode(parentId, choiceText) {
  console.log(`🌿 正在创建分支节点: ${choiceText}`);
  try {
    const response = await fetch(`${BASE_URL}/storyNodes/stories/${storyId}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        parentId: parentId,
        title: choiceText,
        content: '', // 稍后编辑
        type: 'branch',
        choiceText: choiceText
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ 分支节点创建成功:', result.data._id);
      return result.data._id;
    } else {
      console.error('❌ 创建分支节点失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建分支节点错误:', error.message);
    return null;
  }
}

// 更新节点内容
async function updateNode(nodeId, data) {
  console.log(`✏️ 正在更新节点: ${nodeId}`);
  try {
    const response = await fetch(`${BASE_URL}/storyNodes/nodes/${nodeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ 节点更新成功');
      return true;
    } else {
      console.error('❌ 更新节点失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 更新节点错误:', error.message);
    return false;
  }
}

// 获取故事树
async function getStoryTree() {
  console.log('🌳 正在获取故事树...');
  try {
    const response = await fetch(`${BASE_URL}/story-nodes/stories/${storyId}/tree`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ 故事树获取成功');
      console.log('📊 故事结构:');
      printTree(result.data, 0);
      return true;
    } else {
      console.error('❌ 获取故事树失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 获取故事树错误:', error.message);
    return false;
  }
}

// 打印树状结构
function printTree(node, depth) {
  const indent = '  '.repeat(depth);
  const nodeType = node.type === 'choice' ? '🔀' : node.type === 'ending' ? '🏁' : '📖';
  console.log(`${indent}${nodeType} ${node.title} (${node.type})`);
  
  if (node.choices && node.choices.length > 0) {
    node.choices.forEach(choice => {
      console.log(`${indent}  ➡️ ${choice.text}`);
      if (choice.targetNode) {
        printTree(choice.targetNode, depth + 2);
      }
    });
  }
  
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      printTree(child, depth + 1);
    });
  }
}

// 主要执行流程
async function main() {
  console.log('🚀 开始创建范例故事...\n');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) return;
  
  // 2. 创建故事
  const storySuccess = await createStory();
  if (!storySuccess) return;
  
  // 3. 创建根节点
  const rootSuccess = await createRootNode();
  if (!rootSuccess) return;
  
  // 4. 创建第一个选择节点
  const choice1Id = await createChoiceNode(rootNodeId, '你要去哪里？', 
    '面对着神秘的森林，你需要做出第一个选择。这个选择将决定你的冒险方向。每条路都有不同的命运在等待着你。',
    [
      { id: 'choice_1', text: '深入森林', autoCreate: true },
      { id: 'choice_2', text: '留在原地', autoCreate: true }
    ]
  );
  
  if (!choice1Id) return;
  
  // 5. 更新分支节点内容
  const branch1Id = await createBranchNode(choice1Id, '深入森林');
  const branch2Id = await createBranchNode(choice1Id, '留在原地');
  
  if (branch1Id) {
    await updateNode(branch1Id, {
      title: '深入森林',
      content: '你鼓起勇气踏入了森林深处。周围越来越暗，但你听到了远处传来的奇怪声音。古老的树木环绕着你，仿佛在诉说着千年的秘密。你继续前进，发现了一条小径通向更深处。',
      type: 'branch'
    });
  }
  
  if (branch2Id) {
    await updateNode(branch2Id, {
      title: '留在原地',
      content: '你决定在原地观察。很快，你发现了一条小径，通向森林的另一个方向。夕阳西下，金色的光芒洒在林间小路上，你感到一种平静。有时候，不选择也是一种选择。你的冒险以一种平静的方式结束了。',
      type: 'ending'
    });
  }
  
  // 6. 在"深入森林"节点添加更多选择
  const choice2Id = await createChoiceNode(branch1Id, '发现小屋', 
    '在森林深处，你发现了一座神秘的小屋。烟囱里冒着烟，看起来有人居住。小屋的门微微开着，仿佛在邀请你进入。',
    [
      { id: 'choice_3', text: '敲门', autoCreate: true },
      { id: 'choice_4', text: '绕过', autoCreate: true }
    ]
  );
  
  if (!choice2Id) return;
  
  // 7. 更新更多分支节点内容
  const branch3Id = await createBranchNode(choice2Id, '敲门');
  const branch4Id = await createBranchNode(choice2Id, '绕过');
  
  if (branch3Id) {
    await updateNode(branch3Id, {
      title: '敲门',
      content: '你轻轻敲了敲门。门开了，一位和蔼的老人出现在门口。"欢迎，年轻的冒险者，"他说道，"我等了你很久了。进来吧，我有重要的东西要给你。"你的冒险进入了一个全新的阶段。',
      type: 'ending'
    });
  }
  
  if (branch4Id) {
    await updateNode(branch4Id, {
      title: '绕过小屋',
      content: '你决定不打扰小屋的主人，继续在森林中探索。走着走着，你来到了一片美丽的空地，那里有一汪清澈的泉水。你喝了泉水，感到精神焕发。这时你意识到，真正的冒险不是目的地，而是沿途的风景和成长。',
      type: 'ending'
    });
  }
  
  // 8. 获取并显示完整故事树
  console.log('\n🎉 范例故事创建完成！\n');
  await getStoryTree();
  
  console.log(`\n📝 故事编辑链接: http://localhost:8080/story_editor_new.html?story=${storyId}&node=${rootNodeId}`);
  console.log(`🎮 故事播放链接: http://localhost:8080/story_player_new.html?story=${storyId}`);
}

// 运行主流程
main().catch(console.error);