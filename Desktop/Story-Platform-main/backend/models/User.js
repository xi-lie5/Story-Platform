const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名必填'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [30, '用户名不能超过30个字符'],
    index: true // 添加索引以提高查询性能
  },
  email: {
    type: String,
    required: [true, '邮箱必填'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确'],
    index: true // 添加索引以提高查询性能
  },
  password: {
    type: String,
    required: [true, '密码必填'],
    minlength: [8, '密码长度不能少于8位'],
    select: false
  },
  avatar: {
    type: String,
    default: '/avatar/default.png'
  },
  bio: {
    type: String,
    default: '这个人很懒，什么都没留下',
    maxlength: [200, '个人简介不能超过200个字符']
  },
  refreshToken: {
    type: String,
    select: false
  },
  // 添加安全相关字段
  role: {
    type: String,
    enum: ['user', 'editor', 'admin'],
    default: 'user',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true,
    index: true // 添加索引以提高查询性能
  },
  tokenVersion: {
    type: Number,
    default: 1,
    required: true
  },
  // 安全审计字段
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    default: null,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('stories', {
  ref: 'Story',
  foreignField: 'author',
  localField: '_id'
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password);
};

// 增加密码重置方法
userSchema.methods.resetPassword = async function(newPassword) {
  this.password = newPassword;
  this.tokenVersion += 1; // 递增tokenVersion以吊销所有旧令牌
  await this.save();
  return true;
};

// 增加token吊销方法
userSchema.methods.revokeAllTokens = async function() {
  this.tokenVersion += 1;
  this.refreshToken = null;
  await this.save();
  return true;
};

// 增加账户锁定检查方法
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// 增加登录尝试记录方法
userSchema.methods.incrementLoginAttempts = async function() {
  // 如果锁定时间已过期，重置尝试次数
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ loginAttempts: 1, lockUntil: null });
  }
  
  // 增加尝试次数
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 如果尝试次数达到阈值，锁定账户
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 锁定30分钟
  }
  
  return this.updateOne(updates);
};

// 增加重置登录尝试方法
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({ loginAttempts: 0, lockUntil: null });
};

// 增加记录登录时间方法
userSchema.methods.recordLogin = async function() {
  this.lastLogin = new Date();
  await this.resetLoginAttempts();
  return true;
};

// 更新序列化方法，保留安全相关字段
userSchema.methods.toJSON = function serialize() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);