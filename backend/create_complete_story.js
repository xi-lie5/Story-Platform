const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.test' });

async function createCompleteStoryExample() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 连接MongoDB成功');

    const Story = require('./models/Story');
    const StoryNode = require('./models/StoryNode');

    // 1. 创建一个完整的故事示例
    const story = new Story({
      title: '魔法森林的冒险',
      author: new mongoose.Types.ObjectId(), // 临时用户ID
      category: new mongoose.Types.ObjectId(), // 临时分类ID
      coverImage: 'https://example.com/forest-cover.jpg',
      description: '一个关于勇气、智慧和选择的奇幻冒险故事',
      tags: ['奇幻', '冒险', '选择', '魔法'],
      isPublic: true,
      status: 'published'
    });

    await story.save();
    console.log('✅ 创建故事成功:', story.title);

    // 2. 创建故事节点 - 完整的数组结构
    const storyNodes = [
      {
        storyId: story._id,
        title: '第一章：神秘的森林入口',
        content: '你站在一片古老森林的入口处。高大的树木遮天蔽日，空气中弥漫着神秘的气息。森林深处传来奇怪的声音，既像是某种生物的呼唤，又像是魔法的低语。你知道，一旦踏入这片森林，你的人生将彻底改变。',
        type: 'normal', // 使用模型中定义的enum值
        order: 1,
        choices: [
          {
            id: 'choice_1_1',
            text: '勇敢地走进森林',
            description: '毫不犹豫地踏入未知的冒险',
            targetNodeId: null // 稍后设置
          },
          {
            id: 'choice_1_2', 
            text: '先观察一下周围',
            description: '谨慎地收集更多信息再决定',
            targetNodeId: null
          },
          {
            id: 'choice_1_3',
            text: '准备一些装备再进入',
            description: '返回村庄准备必要的物品',
            targetNodeId: null
          }
        ],
        position: { x: 100, y: 50 },
        isEnding: false
      },
      {
        storyId: story._id,
        title: '第二章：深入森林',
        content: '你勇敢地走进了森林。越往深处走，光线越暗，但你的内心却越来越明亮。突然，你发现前方有一棵发光的古老树木，树干上刻着神秘的符文。当你靠近时，符文开始发光，似乎在向你传递某种信息。',
        type: 'normal',
        order: 2,
        choices: [
          {
            id: 'choice_2_1',
            text: '触摸发光的符文',
            description: '直接与神秘的魔法接触',
            targetNodeId: null
          },
          {
            id: 'choice_2_2',
            text: '绕着树观察',
            description: '先了解情况再行动',
            targetNodeId: null
          },
          {
            id: 'choice_2_3',
            text: '寻找其他路径',
            description: '避开可能的危险',
            targetNodeId: null
          }
        ],
        position: { x: 300, y: 50 },
        isEnding: false
      },
      {
        storyId: story._id,
        title: '第三章：谨慎观察',
        content: '你决定先仔细观察周围的环境。在森林边缘，你发现了一些奇怪的脚印和散落的物品。这些线索似乎在诉说着之前冒险者的故事。通过仔细分析，你发现了一条相对安全的路径，还找到了一些有用的物品。',
        type: 'normal',
        order: 3,
        choices: [
          {
            id: 'choice_3_1',
            text: '沿着安全路径前进',
            description: '利用观察到的优势',
            targetNodeId: null
          },
          {
            id: 'choice_3_2',
            text: '收集更多物品',
            description: '为冒险做更充分的准备',
            targetNodeId: null
          }
        ],
        position: { x: 100, y: 200 },
        isEnding: false
      },
      {
        storyId: story._id,
        title: '第四章：魔法觉醒',
        content: '当你触摸符文的瞬间，强大的魔法能量涌入你的身体。你感觉到了前所未有的力量，脑海中涌现出许多古老的记忆。原来，你是被选中的魔法使者，注定要守护这片森林的秘密。',
        type: 'choice',
        order: 4,
        choices: [
          {
            id: 'choice_4_1',
            text: '接受魔法使命',
            description: '成为森林的守护者',
            targetNodeId: null
          },
          {
            id: 'choice_4_2',
            text: '寻求更多指导',
            description: '在完全接受前了解更多',
            targetNodeId: null
          }
        ],
        position: { x: 500, y: 50 },
        isEnding: false
      },
      {
        storyId: story._id,
        title: '结局：森林守护者',
        content: '你接受了魔法使命，成为了新的森林守护者。在你的守护下，这片神秘森林焕发出前所未有的生机。许多年后，人们传说着森林中有一位神秘的守护者，他/她用智慧和勇气保护着这片土地的平衡。你的冒险成为了永恒的传说。',
        type: 'ending',
        order: 5,
        choices: [],
        position: { x: 700, y: 50 },
        isEnding: true
      },
      {
        storyId: story._id,
        title: '结局：智慧的冒险者',
        content: '通过谨慎的观察和准备，你成功地探索了森林的秘密，并安全地返回了村庄。你带回了珍贵的知识和物品，成为了村庄里受人尊敬的智者。你的故事告诉后人：勇气固然重要，但智慧和谨慎同样不可或缺。',
        type: 'ending',
        order: 6,
        choices: [],
        position: { x: 300, y: 350 },
        isEnding: true
      },
      {
        storyId: story._id,
        title: '结局：平凡的幸福',
        content: '你选择了装备充分后再进入森林，但当你准备好时，森林的神秘气息已经消散了。虽然错过了冒险的机会，但你回到了平静的生活中。有时候，平凡的幸福也是一种美好的结局。你偶尔会想起那片森林，但不再后悔自己的选择。',
        type: 'ending',
        order: 7,
        choices: [],
        position: { x: 100, y: 350 },
        isEnding: true
      }
    ];

    // 3. 保存所有节点
    const createdNodes = [];
    for (const nodeData of storyNodes) {
      const node = new StoryNode(nodeData);
      await node.save();
      createdNodes.push(node);
      console.log(`✅ 创建节点: ${node.title}`);
    }

    // 4. 建立节点间的连接关系
    const connections = [
      // 从第一章出发的连接
      { fromChoiceId: 'choice_1_1', toNodeId: createdNodes[1]._id }, // 勇敢进入 -> 第二章
      { fromChoiceId: 'choice_1_2', toNodeId: createdNodes[2]._id }, // 观察 -> 第三章  
      { fromChoiceId: 'choice_1_3', toNodeId: createdNodes[6]._id }, // 准备装备 -> 结局：平凡的幸福
      
      // 从第二章出发的连接
      { fromChoiceId: 'choice_2_1', toNodeId: createdNodes[3]._id }, // 触摸符文 -> 第四章
      { fromChoiceId: 'choice_2_2', toNodeId: createdNodes[2]._id }, // 观察 -> 第三章
      { fromChoiceId: 'choice_2_3', toNodeId: createdNodes[5]._id }, // 其他路径 -> 结局：智慧的冒险者
      
      // 从第三章出发的连接
      { fromChoiceId: 'choice_3_1', toNodeId: createdNodes[5]._id }, // 安全路径 -> 结局：智慧的冒险者
      { fromChoiceId: 'choice_3_2', toNodeId: createdNodes[6]._id }, // 收集物品 -> 结局：平凡的幸福
      
      // 从第四章出发的连接
      { fromChoiceId: 'choice_4_1', toNodeId: createdNodes[4]._id }, // 接受使命 -> 结局：森林守护者
      { fromChoiceId: 'choice_4_2', toNodeId: createdNodes[5]._id }  // 寻求指导 -> 结局：智慧的冒险者
    ];

    // 5. 更新节点的目标节点ID
    for (const connection of connections) {
      await StoryNode.updateOne(
        { 
          storyId: story._id,
          'choices.id': connection.fromChoiceId 
        },
        { 
          $set: { 'choices.$.targetNodeId': connection.toNodeId }
        }
      );
      console.log(`✅ 建立连接: ${connection.fromChoiceId} -> ${connection.toNodeId}`);
    }

    // 6. 输出完整的故事结构
    console.log('\n📚 完整的故事结构:');
    console.log('故事标题:', story.title);
    console.log('节点数量:', createdNodes.length);
    console.log('连接数量:', connections.length);
    
    console.log('\n🎯 故事流程图:');
    for (let i = 0; i < createdNodes.length; i++) {
      const node = createdNodes[i];
      console.log(`\n节点${i + 1}: ${node.title}`);
      console.log(`类型: ${node.type}`);
      console.log(`是否结局: ${node.isEnding}`);
      
      if (node.choices && node.choices.length > 0) {
        console.log('选项:');
        node.choices.forEach((choice, index) => {
          const targetNode = createdNodes.find(n => n._id.toString() === choice.targetNodeId?.toString());
          const targetTitle = targetNode ? targetNode.title : '未连接';
          console.log(`  ${index + 1}. ${choice.text} -> ${targetTitle}`);
        });
      }
    }

    console.log('\n🎉 完整的故事示例创建成功！');
    console.log('这个示例展示了:');
    console.log('✅ 每个节点都是完整的故事章节');
    console.log('✅ 节点间通过choices建立清晰的连接');
    console.log('✅ 支持多种节点类型(story/choice/ending)');
    console.log('✅ 实现了真正的分支叙事结构');

  } catch (error) {
    console.error('❌ 创建示例失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createCompleteStoryExample();