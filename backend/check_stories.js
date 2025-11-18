const mongoose = require('mongoose');
const Story = require('./models/Story');
const User = require('./models/User');
const Category = require('./models/Category');

async function checkStories() {
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/ai-story', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ 数据库连接成功');

    // 查询所有故事及其状态
    const allStories = await Story.find({})
      .populate('author', 'username')
      .populate('category', 'name');

    console.log(`\n📚 数据库中共有 ${allStories.length} 个故事:\n`);

    allStories.forEach((story, index) => {
      console.log(`${index + 1}. 故事ID: ${story._id}`);
      console.log(`   标题: ${story.title}`);
      console.log(`   作者: ${story.author ? story.author.username : '未知作者'}`);
      console.log(`   分类: ${story.category ? story.category.name : '未知分类'}`);
      console.log(`   状态: ${story.status}`);
      console.log(`   公开状态: ${story.isPublic ? '公开' : '私有'}`);
      console.log(`   创建时间: ${story.createdAt}`);
      console.log('---');
    });

    // 查询已发布的公开故事
    const publicStories = await Story.find({ 
      isPublic: true, 
      status: 'published' 
    })
      .populate('author', 'username')
      .populate('category', 'name');

    console.log(`\n🌟 已发布的公开故事共有 ${publicStories.length} 个:\n`);

    publicStories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.title} - ${story.author ? story.author.username : '未知作者'}`);
    });

    // 如果没有已发布的故事，让我们创建一个测试故事
    if (publicStories.length === 0) {
      console.log('\n⚠️  没有已发布的公开故事，正在创建测试故事...');
      
      const testStory = await Story.findOneAndUpdate(
        { title: /测试/i },
        { 
          isPublic: true, 
          status: 'published',
          description: '这是一个测试故事，用于验证explore页面功能'
        },
        { new: true }
      ).populate('author', 'username').populate('category', 'name');

      if (testStory) {
        console.log(`✅ 已更新测试故事: ${testStory.title}`);
        console.log(`   状态: ${testStory.status}`);
        console.log(`   公开状态: ${testStory.isPublic ? '公开' : '私有'}`);
      } else {
        console.log('❌ 没有找到可更新的测试故事');
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkStories();