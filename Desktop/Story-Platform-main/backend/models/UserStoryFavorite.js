const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserStoryFavoriteSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建复合索引，确保用户对同一故事只能收藏一次
UserStoryFavoriteSchema.index({ userId: 1, storyId: 1 }, { unique: true });

// 虚拟字段，关联用户和故事信息
UserStoryFavoriteSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

UserStoryFavoriteSchema.virtual('story', {
  ref: 'Story',
  localField: 'storyId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('UserStoryFavorite', UserStoryFavoriteSchema);