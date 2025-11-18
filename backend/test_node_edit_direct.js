// 简单的节点编辑测试 - 直接测试API
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story')
    .then(() => console.log('✅ 数据库连接成功'))
    .catch(err => console.error('❌ 数据库连接失败:', err));

async function testNodeEditDirectly() {
    try {
        const StoryNode = require('./models/StoryNode');
        const Story = require('./models/Story');
        
        // 查找现有的故事和节点
        const stories = await Story.find({}).limit(1);
        if (stories.length === 0) {
            console.log('❌ 没有找到故事');
            return;
        }
        
        const story = stories[0];
        console.log('✅ 找到故事:', story.title);
        
        // 查找该故事的节点
        const nodes = await StoryNode.find({ storyId: story._id });
        if (nodes.length === 0) {
            console.log('❌ 没有找到节点');
            return;
        }
        
        const node = nodes[0];
        console.log('✅ 找到节点:', node.title);
        console.log('   原内容:', node.content.substring(0, 50) + '...');
        console.log('   原类型:', node.type);
        console.log('   原选项数量:', node.choices ? node.choices.length : 0);
        
        // 测试更新节点
        console.log('\n📝 测试更新节点...');
        
        // 更新基本信息
        node.title = '更新后的标题 - ' + new Date().toLocaleTimeString();
        node.content = '这是更新后的内容，包含了更多的描述和细节。测试时间：' + new Date().toLocaleString();
        node.type = 'choice';
        
        // 添加选项
        node.choices = [
            { id: 'choice1', text: '选项A - 勇敢前进', targetNodeId: null },
            { id: 'choice2', text: '选项B - 谨慎观察', targetNodeId: null },
            { id: 'choice3', text: '选项C - 寻求帮助', targetNodeId: null }
        ];
        
        await node.save();
        
        console.log('✅ 节点更新成功');
        
        // 验证更新结果
        const updatedNode = await StoryNode.findById(node._id);
        console.log('   新标题:', updatedNode.title);
        console.log('   新内容长度:', updatedNode.content.length);
        console.log('   新类型:', updatedNode.type);
        console.log('   新选项数量:', updatedNode.choices.length);
        
        updatedNode.choices.forEach((choice, index) => {
            console.log(`   选项${index + 1}: ${choice.text}`);
        });
        
        console.log('\n🎉 节点编辑功能测试成功！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('详细错误:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testNodeEditDirectly();