const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名必填'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [30, '用户名不能超过30个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱必填'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确']
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
    default: '这个人很懒，什么都没留下'
  },
  refreshToken: {
    type: String,
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

userSchema.methods.toJSON = function serialize() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);