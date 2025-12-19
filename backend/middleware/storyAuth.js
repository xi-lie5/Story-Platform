const Story = require('../models/Story');
const { errorFormat } = require('../utils/errorFormat');

module.exports = async function storyAuth(req, res, next) {
  try {
    const { storyId } = req.params;
    
    if (!storyId) {
      return next(errorFormat(400, '故事ID必填', [], 10010));
    }
    
    // 查找故事
    const story = await Story.findById(storyId);
    
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10011));
    }
    
    // 检查用户权限：只有故事作者可以访问
    if (story.author.toString() !== req.user.id) {
      return next(errorFormat(403, '无权限访问此故事', [], 10005));
    }
    
    // 将故事信息附加到请求对象
    req.story = story;
    
    next();
  } catch (error) {
    console.error('StoryAuth中间件错误:', error);
    return next(errorFormat(500, '权限验证失败', [], 10012));
  }
};