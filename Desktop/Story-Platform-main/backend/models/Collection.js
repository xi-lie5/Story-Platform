const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID必填'],
    index: true
  },
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID必填']
  }
}, { timestamps: { createdAt: 'collectedAt', updatedAt: false } });

collectionSchema.index({ user: 1, story: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);