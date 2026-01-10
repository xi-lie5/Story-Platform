/**
 * 创建测试故事脚本
 * 创建一个包含至少15个节点的完整故事用于测试阅读功能
 */

require('dotenv').config();
const Story = require('../models/Story');
const StoryNode = require('../models/StoryNode');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Category = require('../models/Category');
const bcrypt = require('bcryptjs');

async function createTestStory() {
  console.log('开始创建测试故事...');
  
  try {
    // 1. 查找或创建测试用户
    console.log('\n1. 查找或创建测试用户...');
    let testUser = await User.findByEmail('test@storyforge.com', { includePassword: true });
    
    if (!testUser) {
      // 创建测试用户
      const hashedPassword = await bcrypt.hash('test123456', 10);
      testUser = await User.create({
        username: 'test_user',
        email: 'test@storyforge.com',
        password: hashedPassword,
        isActive: true
      });
      console.log('✓ 创建测试用户成功:', testUser.username, '(ID:', testUser.id + ')');
    } else {
      console.log('✓ 使用现有测试用户:', testUser.username, '(ID:', testUser.id + ')');
    }
    
    // 2. 查找或创建测试分类
    console.log('\n2. 查找或创建测试分类...');
    let testCategory = await Category.findOne({ name: '奇幻冒险' });
    
    if (!testCategory) {
      testCategory = await Category.create({
        name: '奇幻冒险',
        description: '包含魔法、冒险和奇幻元素的分类'
      });
      console.log('✓ 创建测试分类成功:', testCategory.name, '(ID:', testCategory.id + ')');
    } else {
      console.log('✓ 使用现有测试分类:', testCategory.name, '(ID:', testCategory.id + ')');
    }
    
    // 3. 创建测试故事
    console.log('\n3. 创建测试故事...');
    const storyData = {
      title: '迷失森林的冒险',
      author_id: testUser.id,
      category_id: testCategory.id,
      description: '一个关于在神秘森林中冒险的互动故事。你将面临许多选择，每个选择都会影响故事的走向。',
      status: 'published',
      is_public: true,
      cover_image: '/coverImage/1.png'
    };
    
    const story = await Story.create(storyData);
    console.log('✓ 创建测试故事成功:', story.title, '(ID:', story.id + ')');
    
    // 4. 创建节点数据
    console.log('\n4. 创建节点和分支...');
    
    // 定义节点数据（15个节点，包含分支选择）
    const nodesData = [
      // 根节点
      {
        id: 'node-1',
        title: '迷失的开始',
        content: '你在一片陌生的森林中醒来，周围是茂密的树木和神秘的氛围。你完全不知道自己是怎样到达这里的。\n\n阳光透过树叶洒下斑驳的光影，远处传来鸟儿的歌唱声。你感到既害怕又好奇。',
        type: 'regular',
        isRoot: true,
        x: 400,
        y: 50,
        branches: [
          { text: '向森林深处探索', targetId: 'node-2' },
          { text: '寻找返回的路', targetId: 'node-3' }
        ]
      },
      // 路径1：深入森林
      {
        id: 'node-2',
        title: '神秘的深处',
        content: '你决定深入森林。随着你越走越远，周围的环境变得越来越奇怪。树木的形状变得扭曲，空气中弥漫着一种奇异的气息。\n\n突然，你听到前方有声音传来，似乎是某种生物的呼唤声。',
        type: 'branch',
        isRoot: false,
        x: 300,
        y: 200,
        branches: [
          { text: '跟随声音前进', targetId: 'node-4' },
          { text: '小心地绕过去', targetId: 'node-5' }
        ]
      },
      // 路径2：寻找归路
      {
        id: 'node-3',
        title: '寻找归路',
        content: '你决定寻找返回的路。你仔细观察周围的树木和地形，试图找到一些熟悉的标志。\n\n然而，这片森林似乎一直在变化，你找不到任何熟悉的路径。更糟糕的是，你感到有人在暗中观察你。',
        type: 'branch',
        isRoot: false,
        x: 500,
        y: 200,
        branches: [
          { text: '继续寻找', targetId: 'node-6' },
          { text: '寻找帮助', targetId: 'node-7' }
        ]
      },
      // 跟随声音
      {
        id: 'node-4',
        title: '遇见森林精灵',
        content: '你跟随声音前进，来到了一片空地。在那里，你看到了一个美丽的森林精灵。她有着绿色的头发和闪烁着光芒的眼睛。\n\n"人类，你不应该来到这里，"她说道，"但既然你已经来了，我可以帮助你。"',
        type: 'branch',
        isRoot: false,
        x: 200,
        y: 350,
        branches: [
          { text: '接受精灵的帮助', targetId: 'node-8' },
          { text: '保持警惕', targetId: 'node-9' }
        ]
      },
      // 绕过声音
      {
        id: 'node-5',
        title: '发现古老的遗迹',
        content: '你小心地绕过了声音的来源，来到了一片被遗忘的遗迹。这里有着古老的石柱和神秘的符文。\n\n你感到这里充满了魔法能量。在遗迹的中心，你发现了一个发光的宝箱。',
        type: 'branch',
        isRoot: false,
        x: 350,
        y: 350,
        branches: [
          { text: '打开宝箱', targetId: 'node-10' },
          { text: '研究符文', targetId: 'node-11' }
        ]
      },
      // 继续寻找
      {
        id: 'node-6',
        title: '遇到森林守护者',
        content: '你继续寻找归路，但迷路了。就在你感到绝望的时候，一个巨大的森林守护者出现在你面前。\n\n"人类，你破坏了森林的平衡，"守护者低沉的声音说道，"但如果你能完成一个任务，我可以带你离开这里。"',
        type: 'branch',
        isRoot: false,
        x: 450,
        y: 350,
        branches: [
          { text: '接受任务', targetId: 'node-12' },
          { text: '尝试说服守护者', targetId: 'node-13' }
        ]
      },
      // 寻找帮助
      {
        id: 'node-7',
        title: '遇见旅行商人',
        content: '你在寻找帮助的过程中，遇到了一个神秘的旅行商人。他有着一顶奇怪的帽子和一个装满神奇物品的背包。\n\n"看起来你需要帮助，"商人笑着说道，"我可以卖给你一些有用的物品，或者告诉你一个秘密。"',
        type: 'branch',
        isRoot: false,
        x: 550,
        y: 350,
        branches: [
          { text: '购买物品', targetId: 'node-14' },
          { text: '询问秘密', targetId: 'node-15' }
        ]
      },
      // 接受精灵帮助
      {
        id: 'node-8',
        title: '精灵的指引',
        content: '你接受了森林精灵的帮助。她给了你一片神奇的叶子，说它会指引你找到出路。\n\n叶子在你手中发光，指向一个特定的方向。你沿着指引前进，发现了一条隐藏的小径。',
        type: 'end',
        isRoot: false,
        x: 100,
        y: 500,
        branches: []
      },
      // 保持警惕
      {
        id: 'node-9',
        title: '精灵的考验',
        content: '你保持警惕，没有轻易接受精灵的帮助。精灵对你点了点头，表示赞赏。\n\n"你很聪明，"她说，"但有时候信任是必要的。我可以教你一些森林的智慧，这将帮助你在这里生存。"\n\n你学到了很多关于森林的知识，最终找到了出路。',
        type: 'end',
        isRoot: false,
        x: 250,
        y: 500,
        branches: []
      },
      // 打开宝箱
      {
        id: 'node-10',
        title: '宝箱的秘密',
        content: '你打开了宝箱，里面发出耀眼的光芒。当光芒散去后，你看到了一把古老的魔法剑。\n\n当你握住剑柄的瞬间，你感到一股强大的力量涌入体内。这把剑似乎有着自己的意志，它想要保护你。\n\n有了这把剑，你变得更加自信，最终征服了森林中的各种挑战，找到了回家的路。',
        type: 'end',
        isRoot: false,
        x: 300,
        y: 500,
        branches: []
      },
      // 研究符文
      {
        id: 'node-11',
        title: '符文的智慧',
        content: '你决定研究这些古老的符文。随着你对符文的解读，你逐渐理解了这片森林的奥秘。\n\n符文揭示了森林的历史和秘密。你发现了一个传送法阵，它可以带你回到原来的世界。\n\n你激活了法阵，成功地回到了家。',
        type: 'end',
        isRoot: false,
        x: 400,
        y: 500,
        branches: []
      },
      // 接受守护者任务
      {
        id: 'node-12',
        title: '守护者的任务',
        content: '你接受了森林守护者的任务：清除森林中的邪恶污染。你开始了艰苦的战斗。\n\n经过一番努力，你成功地完成了任务。守护者对你表示感谢，并履行了承诺，带你离开了森林。',
        type: 'end',
        isRoot: false,
        x: 425,
        y: 500,
        branches: []
      },
      // 说服守护者
      {
        id: 'node-13',
        title: '说服成功',
        content: '你尝试说服守护者。通过你的智慧和真诚，你成功地让守护者相信你并不是故意破坏森林的。\n\n守护者被你的真诚所感动，不仅原谅了你，还给了你一片森林的叶子作为纪念。\n\n你带着纪念品，在守护者的指引下离开了森林。',
        type: 'end',
        isRoot: false,
        x: 475,
        y: 500,
        branches: []
      },
      // 购买物品
      {
        id: 'node-14',
        title: '神奇物品',
        content: '你从商人那里购买了一个神奇的罗盘。这个罗盘可以指向你心中想要去的地方。\n\n你使用罗盘，很快就找到了离开森林的路径。虽然花费了一些金币，但你觉得这是值得的。\n\n你安全地离开了森林，回到了家。',
        type: 'end',
        isRoot: false,
        x: 525,
        y: 500,
        branches: []
      },
      // 询问秘密
      {
        id: 'node-15',
        title: '森林的秘密',
        content: '你选择询问商人关于森林的秘密。商人告诉你，这片森林其实是一个魔法空间，只有通过特定的仪式才能离开。\n\n他告诉你仪式的步骤，但警告你说，如果失败，你将永远被困在这里。\n\n你按照商人的指引，成功地完成了仪式，安全地离开了森林。',
        type: 'end',
        isRoot: false,
        x: 575,
        y: 500,
        branches: []
      }
    ];
    
    // 5. 批量创建节点和分支
    console.log('开始保存节点和分支...');
    const result = await StoryNode.processNodeRelations(nodesData, story.id);
    
    console.log('\n✓ 创建节点和分支成功!');
    console.log('  节点总数:', nodesData.length);
    console.log('  分支总数:', nodesData.reduce((sum, node) => sum + (node.branches?.length || 0), 0));
    console.log('\n故事信息:');
    console.log('  故事ID:', story.id);
    console.log('  故事标题:', story.title);
    console.log('  故事状态:', story.status);
    console.log('  是否公开:', story.is_public ? '是' : '否');
    
    console.log('\n✓ 测试故事创建完成!');
    console.log('\n你可以在以下URL查看故事:');
    console.log(`  http://localhost:5000/front/story-reader.html?id=${story.id}`);
    console.log('\n或者在浏览器中访问故事阅览页面，搜索"迷失森林的冒险"');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ 创建测试故事失败:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行脚本
createTestStory();

