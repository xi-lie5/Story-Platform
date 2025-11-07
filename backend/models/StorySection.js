const { text } = require('express');
const mongoose = require('mongoose');

const StorySectionSchema = new mongoose.Schema({
    storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story',
        required: [true, '故事ID必填'],
        index: true
    },
    storytype: {
        type: String,
        required: [true, '章节类型必填'],
        enum: ['text', 'choice']
    },
    //章节顺序（数字越小越靠前）
    order: {
        type: Number,
        required: [true, '章节顺序必填'],
        min: 1 // 顺序从1开始（符合用户对“第一章”的认知）
    },
    text: {
        type: String,
        required: [true, '章节文本必填']
    },
    choice: [{ // 仅type=choice时存在（API文档结构）
        text: {
            type: String,
            required: [true, '选项文本必填']
        },
        nextSectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StorySection',
            required: [true, '下一章节ID必填']
        }
    }],
    isEnd: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
)

//关键索引：同一故事内章节顺序不能重复
StorySectionSchema.index(
  { storyId: 1, order: 1 },
  { unique: true, message: '同一故事内章节顺序不能重复' }
);


module.exports = mongoose.model('StorySection', StorySectionSchema);