const mongoose = require('mongoose'); // 关键：导入 mongoose 模块
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        match: [/^[a-zA-Z0-9_]{1,20}$/, '用户名只能包含字母、数字、下划线,长度1-20位'],
        required: [true, '用户名必填'],
        unique: [true, '用户名已存在'],
        trim: true
    },
    email: {
        type: String,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '邮箱格式不正确'],
        required: [true, '邮箱必填'],
        unique: [true, '邮箱已存在'],
        trim: true
    },
    password: {
        type: String,
        match: [/^[a-zA-Z0-9_]{8,}$/, '密码只能包含字母、数字、下划线,长度不能少于8位'],
        required: [true, '密码必填'],
        trim: true
    },
    confirmPassword: {
        type: String,
        required: [true, '请确认密码'],
        validate: {
            validator: function (val) {
                return val === this.password; // 密码一致性校验（错误码10005）
            },
            message: '密码不一致'
        }
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
        type: String // 存储刷新令牌（适配刷新接口）
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// 虚拟字段：关联用户的故事（不存储在数据库，查询时关联）
userSchema.virtual('stories', {
  ref: 'Story',
  foreignField: 'author',
  localField: '_id'
});

// 密码加密（保存前执行）
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.confirmPassword = undefined; // 确认密码不存入数据库
  next();
});

// 密码验证方法（登录时用）
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);