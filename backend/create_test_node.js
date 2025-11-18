// 创建测试节点
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story')
    .then(() => console.log('✅ 数据库连接成功'))
    .catch(err => console.error('❌ 数据库连接失败:', err));

async function createTestNode() {
    try {
        const StoryNode = require('./models/StoryNode');
        const Story = require('./models/Story');
        
        // 查找现有的故事
        const stories = await Story.find({}).limit(1);
        if (stories.length === 0) {
            console.log('❌ 没有找到故事');
            return;
        }
        
        const story = stories[0];
        console.log('✅ 找到故事:', story.title);
        
        // 创建测试节点
        const testNode = new StoryNode({
            title: '起始节点',
            content: '这是故事的开始。你站在一个十字路口，需要做出选择。',
            type: 'choice',
            storyId: story._id,
            choices: [
                { id: 'choice1', text: '向左走', targetNodeId: null },
                { id: 'choice2', text: '向右走', targetNodeId: null }
            ],
            metadata: {
                difficulty: 'easy',
                estimatedTime: '2-3 minutes'
            }
        });
        
        await testNode.save();
        console.log('✅ 测试节点创建成功');
        console.log('   节点ID:', testNode._id);
        console.log('   标题:', testNode.title);
        console.log('   选项数量:', testNode.choices.length);
        
    } catch (error) {
        console.error('❌ 创建节点失败:', error.message);
        console.error('详细错误:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createTestNode();