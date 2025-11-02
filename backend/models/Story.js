const mongoose = require('mongoose')

const StorySchema = new mongoess.Schema({
    title: {
        type: String,
        required: [true, '故事标题必填'],
        trim: true,
        maxlength: [100, '故事标题不能超过100个字符'],
        minlength: [1, '故事标题不能少于1个字符']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',//约等于设置User外键
        required: [true, '故事作者ID必填'],
        index: true // 索引优化：按作者查询故事
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',//约等于设置Category外键
        required: [true, '分类ID必填'],
        index: true // 索引优化：按分类筛选故事（API的category参数）
    },
    coverImage: {
        type: String,
        default: '/coverImage/1.png'
    },
    description: {
        type: String,
        require: [true, '故事描述必填'],
    },
    // 评分范围（API文档字段）
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    // 浏览量（API文档字段）
    view: {
        type: Number,
        default: 0,
        min: 0,
        indext:-1
    }
},
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

StorySchema.virtuals("sections", {
    ref: 'StorySection',
    localField: '_id',
    foreignField: 'storyId',
})

// 索引优化：按标题/简介搜索（API的search参数）
StorySchema.index({ title: 'text', description: 'text' });
StorySchema.index({ createdAt: -1 });//Mongoose 提供了一个 timestamps 选项，可以自动为你的模型添加 createdAt 和 updatedAt 字段

module.exports = mongoose.model('Story', StorySchema);