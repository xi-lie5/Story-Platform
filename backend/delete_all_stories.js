const mongoose = require('mongoose');
const Story = require('./models/Story');
const Category = require('./models/Category');
require('dotenv').config();

async function deleteAllStories() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('已连接到数据库');
    
    // 1. 统计当前作品数量
    const totalStories = await Story.countDocuments();
    console.log(`当前数据库中共有 ${totalStories} 个作品`);
    
    if (totalStories === 0) {
      console.log('数据库中没有作品，无需删除');
      return;
    }
    
    // 2. 显示所有作品信息
    const allStories = await Story.find().select('_id title status category author');
    console.log('\n即将删除的作品列表:');
    allStories.forEach((story, index) => {
      console.log(`${index + 1}. ID: ${story._id}, 标题: ${story.title || '未命名'}, 状态: ${story.status}, 分类: ${story.category}, 作者: ${story.author}`);
    });
    
    // 3. 确认删除
    console.log('\n⚠️  警告：即将删除所有作品！');
    console.log('这个操作不可逆！');
    
    // 4. 获取所有分类ID，用于后续更新故事数量
    const categories = await Category.find().select('_id storyCount');
    const categoryStoryCount = {};
    
    // 统计每个分类下的故事数量
    for (const story of allStories) {
      if (story.category) {
        categoryStoryCount[story.category] = (categoryStoryCount[story.category] || 0) + 1;
      }
    }
    
    // 5. 删除所有作品
    const deleteResult = await Story.deleteMany({});
    console.log(`\n✅ 成功删除 ${deleteResult.deletedCount} 个作品`);
    
    // 6. 更新所有分类的故事数量为0
    const categoryUpdateResult = await Category.updateMany(
      {},
      { $set: { storyCount: 0 } }
    );
    console.log(`✅ 更新了 ${categoryUpdateResult.modifiedCount} 个分类的故事数量`);
    
    // 7. 验证删除结果
    const remainingStories = await Story.countDocuments();
    console.log(`\n验证：数据库中剩余 ${remainingStories} 个作品`);
    
    if (remainingStories === 0) {
      console.log('🎉 所有作品已成功删除！');
    } else {
      console.log('⚠️  仍有作品未删除完全');
    }
    
  } catch (error) {
    console.error('删除作品时发生错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 执行删除操作
deleteAllStories();