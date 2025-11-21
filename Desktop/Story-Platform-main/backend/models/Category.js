const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '分类名称必填'],
        unique: [true, '分类已存在']
    },
    description: {
        type: String,
        default: ''
    },
    storyCount: {
        type: Number,
        default: 0 // 统计该分类下的故事数量（API文档字段）
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);