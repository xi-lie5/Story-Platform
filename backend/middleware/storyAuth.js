const Story = require('../models/Story');
const { errorFormat } = require('../utils/errorFormat');
const { isValidIntegerId } = require('../utils/idValidator');

module.exports = async function storyAuth(req, res, next) {
  try {
    const { storyId } = req.params;
    
    if (!storyId) {
      return next(errorFormat(400, '故事ID必填', [], 10010));
    }
    
    // 验证storyId格式
    if (!isValidIntegerId(storyId)) {
      return next(errorFormat(400, '无效的故事ID格式', [], 10010));
    }
    
    // 查找故事
    const story = await Story.findById(parseInt(storyId));
    
    if (!story) {
      return next(errorFormat(404, '故事不存在', [], 10011));
    }
    
    // 检查用户权限：只有故事作者可以访问
    // Story模型返回的是author_id字段（数字），不是author对象
    const storyAuthorId = story.author_id || story.author;
    const userId = parseInt(req.user.id);
    
    if (storyAuthorId !== userId) {
      console.warn(`权限验证失败: 故事作者ID=${storyAuthorId}, 用户ID=${userId}`);
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