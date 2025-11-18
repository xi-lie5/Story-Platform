const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '故事标题必填'],
    trim: true,
    maxlength: [100, '故事标题不能超过100个字符']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '故事作者ID必填'],
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, '分类ID必填'],
    index: true
  },
  coverImage: {
    type: String,
    default: '/coverImage/1.png'
  },
  description: {
    type: String,
    required: [true, '故事简介必填'],
    maxlength: [500, '故事简介不能超过500个字符']
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  view: {
    type: Number,
    default: 0,
    min: 0
  },
  favoriteCount: {
    type: Number,
    default: 0,
    min: 0
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, '标签不能超过20个字符']
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'archived', 'rejected'],
    default: 'draft',
    index: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewComment: {
    type: String,
    maxlength: [500, '审核意见不能超过500个字符']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

storySchema.virtual('sections', {
  ref: 'StorySection',
  localField: '_id',
  foreignField: 'storyId'
});

// 添加复合索引以优化常用查询
storySchema.index({ title: 'text', description: 'text' });
storySchema.index({ createdAt: -1 });
storySchema.index({ updatedAt: -1 });
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ category: 1, rating: -1 });
storySchema.index({ category: 1, view: -1 });
storySchema.index({ isPublic: 1, createdAt: -1 });
storySchema.index({ isPublic: 1, rating: -1 });
storySchema.index({ isPublic: 1, view: -1 });

// 添加批量更新方法以减少数据库操作
storySchema.statics.bulkUpdateStats = async function(storyIds, updates) {
  return this.updateMany(
    { _id: { $in: storyIds } },
    { $set: updates },
    { multi: true }
  );
};

// 添加查询优化方法
storySchema.statics.findWithPagination = async function(query, options = {}) {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  // 构建查询条件
  const queryObj = { ...query };
  if (queryObj.isPublic === undefined) {
    queryObj.isPublic = true;
  }

  // 执行查询
  const stories = await this.find(queryObj)
    .populate('author', 'username avatar')
    .populate('category', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean(); // 使用lean()提高查询性能

  const total = await this.countDocuments(queryObj);

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total
    }
  };
};

module.exports = mongoose.model('Story', storySchema);