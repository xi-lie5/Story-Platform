const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserStoryRatingSchema = new Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: '评分必须是整数'
    }
  },
  comment: {
    type: String,
    maxlength: 500,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建复合索引，确保用户对同一故事只能有一个评分记录
UserStoryRatingSchema.index({ userId: 1, storyId: 1 }, { unique: true });

// 虚拟字段，关联用户和故事信息
UserStoryRatingSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

UserStoryRatingSchema.virtual('story', {
  ref: 'Story',
  localField: 'storyId',
  foreignField: '_id',
  justOne: true
});

// 评分更新时自动更新时间戳
UserStoryRatingSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('UserStoryRating', UserStoryRatingSchema);