const mongoose = require('mongoose');

const storySectionSchema = new mongoose.Schema({
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID必填'],
    index: true
  },
  temporaryId: {
    type: String,
    index: true,
    description: '前端临时ID，用于ID映射'
  },
  type: {
    type: String,
    required: [true, '章节类型必填'],
    enum: ['text', 'choice'],
    default: 'text',
    index: true // 添加索引以支持按类型过滤
  },
  order: {
    type: Number,
    required: [true, '章节顺序必填'],
    min: 1
  },
  title: {
    type: String,
    description: '章节标题，用于编辑界面显示',
    index: true // 添加索引以支持标题搜索
  },
  text: {
    type: String,
    required: [true, '章节文本必填']
  },
  visualPosition: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  },
  choices: [{
    id: {
      type: String,
      description: '选项唯一标识'
    },
    text: {
      type: String,
      required: [true, '选项文本必填']
    },
    description: {
      type: String,
      description: '选项描述'
    },
    nextSectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorySection',
      required: false
    },
    nextTemporaryId: {
      type: String,
      description: '临时章节ID引用，用于保存时的ID映射'
    }
  }],
  isEnd: {
    type: Boolean,
    default: false,
    index: true // 添加索引以优化对结束章节的查询
  },
  statistics: {
    viewCount: {
      type: Number,
      default: 0
    },
    avgReadTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  minimize: true, // 不存储空对象
  versionKey: false // 禁用__v字段
});

// 原有的复合唯一索引
storySectionSchema.index(
  { storyId: 1, order: 1 },
  { unique: true, message: '同一故事内章节顺序不能重复' }
);

// 添加更多性能优化索引
storySectionSchema.index({ storyId: 1, createdAt: 1 });
storySectionSchema.index({ storyId: 1, updatedAt: -1 });
storySectionSchema.index({ storyId: 1, type: 1 });

// 添加批量操作方法以减少数据库调用
storySectionSchema.statics.bulkUpdateByStory = async function(storyId, updates) {
  return this.updateMany(
    { storyId: storyId },
    { $set: updates },
    { multi: true }
  );
};

// 添加批量创建方法
storySectionSchema.statics.bulkCreateSections = async function(sections) {
  return this.insertMany(sections, { ordered: false }); // 无序插入以提高性能
};

// 添加优化的查询方法
storySectionSchema.statics.findWithStory = async function(storyId, options = {}) {
  const query = { storyId: storyId };
  
  // 如果指定了类型过滤
  if (options.type) {
    query.type = options.type;
  }
  
  // 执行查询，使用lean()提高性能
  return this.find(query)
    .sort(options.sort || { order: 1 })
    .select(options.select || '')
    .lean();
};

module.exports = mongoose.model('StorySection', storySectionSchema);