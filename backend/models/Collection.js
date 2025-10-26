const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '用户ID必填'],
        index: true // 索引优化：按用户查询收藏
    },
    story: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story',
        required: [true, '故事ID必填'],
        unique: true // 同一故事只能收藏一次
    }
}, { timestamps: { createdAt: 'collectedAt' } }); // 收藏时间（API文档字段）

module.exports = mongoose.model('Collection', collectionSchema);