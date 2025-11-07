const mongoose = require('mongoose');

const storySectionSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID必填'],
    index: true
  },
  type: {
    type: String,
    required: [true, '章节类型必填'],
    enum: ['text', 'choice'],
    default: 'text'
  },
  order: {
    type: Number,
    required: [true, '章节顺序必填'],
    min: 1
  },
  text: {
    type: String,
    required: [true, '章节文本必填']
  },
  choices: [{
    text: {
      type: String,
      required: [true, '选项文本必填']
    },
    nextSectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorySection',
      required: false
    }
  }],
  isEnd: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

storySectionSchema.index(
  { storyId: 1, order: 1 },
  { unique: true, message: '同一故事内章节顺序不能重复' }
);

module.exports = mongoose.model('StorySection', storySectionSchema);