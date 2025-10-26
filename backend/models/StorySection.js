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
        eum: ['text', 'choice']
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

module.exports = mongoose.model('StorySection', StorySectionSchema);