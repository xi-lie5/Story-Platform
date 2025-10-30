//https://blog.csdn.net/qq_41853447/article/details/108539155---mongodb语句大全

const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');
// const { refreshAuth } = require('../middleware/refreshAuth');

const route = express.Router();
const BASE_URL = '/api/v1';

// 生成双令牌（accessToken+refreshToken）
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};


route.post('/register', [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('email').isEmail().withMessage('邮箱格式不正确'),
    body('password').isLength({ min: 8 }, { max: 1000 }).withMessage('密码长度不能少于8位'),
    body('confirmPassword').notEmpty().withMessage('请确认密码'),
], async (req, res, next) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        return next(errorFormat(400, '注册失败', validation.array()));
    }
    try {
        const { username, email, password, confirmPassword } = req.body;
        const userByUser = await User.findOne({ username });
        if (userByUser) {
            return next(errorFormat(400,'用户名已存在',[{ field: 'username', message: '用户名已存在' }], 10001));
        }
        const emailByUser = await User.findOne({ email });
        if (emailByUser) {
            return next(errorFormat(400, '邮箱已存在',[{ field: 'email', message: '邮箱已存在' }], 10002));
        }
        if (password != confirmPassword) {
            return next(errorFormat(400, '密码不一致',[{ field: 'confirmPassword', message: '密码不一致' }], 10005));
        }

        const user = await User.create({ username, email, password, confirmPassword })//创建用户并储存

        // 生成令牌
        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false }); // 跳过confirmpassword校验

        res.status(200).json({
            success: true,
            message: "注册成功",
            data: {
                userId: user._id,
                username: user.username,
                email: user.email,
                token: accessToken,// JWT令牌 
                refreshToken
            }
        })
    } catch (err) {
        next(err); // 交给全局错误处理
    }

})

module.exports = route; 