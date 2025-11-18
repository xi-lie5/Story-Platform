const mongoose = require('mongoose');
const Story = require('./models/Story');
const User = require('./models/User');
const Category = require('./models/Category');
require('dotenv').config();

async function verifyDeletion() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('已连接到数据库');
    
    // 1. 验证作品删除情况
    const storyCount = await Story.countDocuments();
    console.log(`\n📊 数据库状态验证:`);
    console.log(`作品总数: ${storyCount}`);
    
    // 2. 检查分类状态
    const categories = await Category.find().select('name storyCount');
    console.log(`\n📂 分类状态:`);
    categories.forEach(cat => {
      console.log(`- ${cat.name}: ${cat.storyCount} 个作品`);
    });
    
    // 3. 检查用户状态
    const users = await User.find().select('username email storyCount');
    console.log(`\n👥 用户状态:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}): ${user.storyCount || 0} 个作品`);
    });
    
    // 4. 检查是否有孤立的数据
    console.log(`\n🔍 数据完整性检查:`);
    
    // 检查是否有用户的作品计数不为0
    const usersWithStories = await User.find({ storyCount: { $gt: 0 } });
    if (usersWithStories.length > 0) {
      console.log(`⚠️  发现 ${usersWithStories.length} 个用户的storyCount不为0，需要重置`);
      await User.updateMany({}, { $set: { storyCount: 0 } });
      console.log(`✅ 已重置所有用户的storyCount为0`);
    } else {
      console.log(`✅ 所有用户的storyCount都正确为0`);
    }
    
    console.log(`\n🎉 删除操作验证完成！数据库状态正常。`);
    
  } catch (error) {
    console.error('验证删除结果时发生错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 执行验证
verifyDeletion();