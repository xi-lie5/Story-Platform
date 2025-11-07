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

storySchema.index({ title: 'text', description: 'text' });
storySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);