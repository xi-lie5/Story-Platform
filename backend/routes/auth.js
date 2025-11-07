const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');
const refreshAuth = require('../middleware/refreshAuth');

const router = express.Router();

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL
  });

  return { accessToken, refreshToken };
}

function mapValidationErrors(errors) {
  return errors.array().map((err) => ({
    field: err.path,
    message: err.msg
  }));
}

router.post('/register', [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('email').isEmail().withMessage('邮箱格式不正确'),
  body('password').isLength({ min: 8 }).withMessage('密码长度不能少于8位'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('两次输入的密码不一致');
    }
    return true;
  })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '注册失败', mapValidationErrors(errors), 10001));
  }

  try {
    const { username, email, password } = req.body;

    if (await User.exists({ username })) {
      return next(errorFormat(400, '用户名已存在', [{ field: 'username', message: '用户名已存在' }], 10001));
    }

    if (await User.exists({ email })) {
      return next(errorFormat(400, '邮箱已存在', [{ field: 'email', message: '邮箱已存在' }], 10002));
    }

    const user = await User.create({ username, email, password });

    const { accessToken, refreshToken } = generateTokens(user.id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token: accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', [
  body('email').isEmail().withMessage('邮箱格式不正确'),
  body('password').notEmpty().withMessage('密码不能为空')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '登录失败', mapValidationErrors(errors), 10001));
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      return next(errorFormat(401, '邮箱或密码错误', [{ message: '邮箱或密码错误' }], 10006));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(errorFormat(401, '邮箱或密码错误', [{ message: '邮箱或密码错误' }], 10006));
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token: accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('刷新令牌不能为空')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '刷新令牌校验失败', mapValidationErrors(errors), 10007));
  }
  return refreshAuth(req, res, next);
}, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+refreshToken');
    if (!user) {
      return next(errorFormat(404, '用户不存在', [], 10013));
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: '刷新令牌成功',
      data: {
        token: accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(200).json({ success: true, message: '已退出登录' });
    }

    const payload = jwt.decode(refreshToken);
    if (!payload?.id) {
      return res.status(200).json({ success: true, message: '已退出登录' });
    }

    await User.findByIdAndUpdate(payload.id, { refreshToken: null });
    res.status(200).json({ success: true, message: '已退出登录' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
