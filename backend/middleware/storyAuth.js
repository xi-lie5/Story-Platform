// middleware/storyAuth.js
const Story = require('../models/Story');

// 集中配置
const ERR = {
  BAD_REQUEST: (msg, code) => require('../utils/errorFormat')(400, msg, [], code),
  NOT_FOUND:   (msg, code) => require('../utils/errorFormat')(404, msg, [], code),
  FORBIDDEN:   (msg, code) => require('../utils/errorFormat')(403, msg, [], code),
};

const CODES = {
  STORY_ID_REQUIRED: 10010,
  STORY_NOT_EXIST:   10011,
  NOT_AUTHOR:        10005,
};

module.exports = async function storyAuth(req, res, next) {
  const { storyId } = req.params;
  if (!storyId) return next(ERR.BAD_REQUEST('故事ID必填', CODES.STORY_ID_REQUIRED));

  const story = await Story.findById(storyId);        // 如有软删除：.findOne({ _id: storyId, deletedAt: null })
  if (!story) return next(ERR.NOT_FOUND('故事不存在', CODES.STORY_NOT_EXIST));

  if (!story.author.equals(req.user.id)) {            // 兼容 ObjectId 与字符串
    return next(ERR.FORBIDDEN('无权限访问此故事', CODES.NOT_AUTHOR));
  }

  req.story = story;
  next();
};