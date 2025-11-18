const mongoose = require('mongoose');
const Story = require('./models/Story');
require('dotenv').config();

async function checkStory() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('已连接到数据库');
    
    const storyId = '69199a69fa2eb2bf6de5050e';
    console.log(`查询作品ID: ${storyId}`);
    
    // 检查ID格式
    console.log('ID格式验证:', mongoose.Types.ObjectId.isValid(storyId));
    
    // 查询作品
    const story = await Story.findById(storyId);
    console.log('查询结果:', story);
    
    // 查询所有作品
    const allStories = await Story.find().select('_id title status').limit(10);
    console.log('前10个作品:');
    allStories.forEach(s => {
      console.log(`ID: ${s._id}, 标题: ${s.title}, 状态: ${s.status}`);
    });
    
    // 查询待审核的作品
    const pendingStories = await Story.find({ status: 'pending' }).select('_id title status');
    console.log('\n待审核作品:');
    pendingStories.forEach(s => {
      console.log(`ID: ${s._id}, 标题: ${s.title}, 状态: ${s.status}`);
    });
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStory();