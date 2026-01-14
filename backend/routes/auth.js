const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');
const refreshAuth = require('../middleware/refreshAuth');

const router = express.Router();

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

async function generateTokens(userId, tokenVersion = 0) {
  // 检查JWT密钥是否配置
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET环境变量未配置');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET环境变量未配置');
  }

  const accessToken = jwt.sign({ 
    id: userId, 
    tokenVersion 
  }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  });
  const refreshToken = jwt.sign({ 
    id: userId, 
    tokenVersion 
  }, process.env.JWT_REFRESH_SECRET, {
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

    const { accessToken, refreshToken } = await generateTokens(user.id, user.tokenVersion || 0);
    user.refreshToken = refreshToken;
    await user.save();

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
  try {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, '登录失败', mapValidationErrors(errors), 10001));
  }

    const { email, password } = req.body;
    
    console.log('登录请求:', { email });

    const user = await User.findOne({ email }, { includePassword: true });
    
    if (!user) {
      console.log('用户不存在:', email);
      return next(errorFormat(401, '邮箱或密码错误', [{ message: '邮箱或密码错误' }], 10006));
    }
    
    console.log('用户找到，ID:', user.id, '用户名:', user.username);
    console.log('密码字段是否存在:', !!user.password);
    console.log('密码字段类型:', typeof user.password);
    console.log('密码字段长度:', user.password ? user.password.length : 0);

    // 检查用户账户是否被禁用
    // 兼容两种字段名：isActive 和 is_active
    const isActive = user.isActive !== undefined ? user.isActive : (user.is_active !== undefined ? user.is_active : true);
    if (!isActive) {
      console.log('账户已被封禁:', email);
      return next(errorFormat(403, '该账号已被封禁，请联系管理员', [{ message: '该账号已被封禁，请联系管理员' }], 10020));
    }

    // 检查账户是否被锁定
    const lockUntil = user.lockUntil || user.lock_until;
    if (lockUntil) {
      const lockTime = new Date(lockUntil);
      const now = new Date();
      if (lockTime > now) {
        const remainingMinutes = Math.ceil((lockTime - now) / 1000 / 60);
        console.log('账户已被锁定:', { email, lockUntil, remainingMinutes });
        return next(errorFormat(403, `账户已被锁定，请${remainingMinutes > 0 ? remainingMinutes + '分钟' : '稍后'}后再试`, [{ message: `账户已被锁定，请${remainingMinutes > 0 ? remainingMinutes + '分钟' : '稍后'}后再试` }], 10021));
      } else {
        // 锁定时间已过期，重置锁定状态
        console.log('锁定时间已过期，重置锁定状态:', email);
        try {
          await user.resetLoginAttempts();
        } catch (resetError) {
          console.error('重置锁定状态失败:', resetError);
        }
      }
    }

    // 检查密码字段是否已加载
    if (!user.password) {
      console.error('密码字段未加载:', { userId: user.id, email });
      // 重新尝试加载密码
      const userWithPassword = await User.findOne({ email }, { includePassword: true });
      if (!userWithPassword || !userWithPassword.password) {
        console.error('无法加载用户密码:', email);
        return next(errorFormat(500, '系统错误，请稍后重试', [{ message: '系统错误，请稍后重试' }], 10099));
      }
      user.password = userWithPassword.password;
    }

    let isMatch;
    try {
      console.log('开始验证密码，用户ID:', user.id, '邮箱:', email);
      console.log('密码字段是否存在:', !!user.password);
      console.log('密码字段类型:', typeof user.password);
      console.log('密码字段长度:', user.password ? user.password.length : 0);
      console.log('输入密码长度:', password ? password.length : 0);
      
      isMatch = await user.matchPassword(password);
      console.log('密码验证结果:', isMatch);
    } catch (error) {
      console.error('密码验证错误:', error);
      console.error('错误堆栈:', error.stack);
      console.error('用户信息:', { userId: user.id, email, hasPassword: !!user.password });
      // 增加登录尝试次数
      try {
        await user.incrementLoginAttempts();
      } catch (lockError) {
        console.error('增加登录尝试次数失败:', lockError);
      }
      return next(errorFormat(500, '系统错误，请稍后重试', [{ message: '系统错误，请稍后重试' }], 10099));
    }
    
    if (!isMatch) {
      console.log('密码不匹配:', email);
      console.log('用户ID:', user.id);
      console.log('密码字段前10个字符:', user.password ? user.password.substring(0, 10) : 'null');
      // 增加登录尝试次数
      try {
        await user.incrementLoginAttempts();
      } catch (lockError) {
        console.error('增加登录尝试次数失败:', lockError);
      }
      return next(errorFormat(401, '邮箱或密码错误', [{ message: '邮箱或密码错误' }], 10006));
    }

    // 登录成功，重置登录尝试次数
    try {
      // 在重置登录尝试次数之前，清除password字段，避免save()方法误处理
      const originalPassword = user.password;
      user.password = undefined;
      await user.resetLoginAttempts();
      // 恢复password字段（不保存到数据库）
      user.password = originalPassword;
    } catch (resetError) {
      console.error('重置登录尝试次数失败:', resetError);
    }

    const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : (user.token_version !== undefined ? user.token_version : 0);
    
    console.log('准备生成Token:', { userId: user.id, tokenVersion });
    
    const { accessToken, refreshToken } = await generateTokens(user.id, tokenVersion);
    
    console.log('Token生成成功');
    
    // 使用findByIdAndUpdate更新refreshToken，避免影响密码
    await User.findByIdAndUpdate(user.id, { refreshToken: refreshToken });

    console.log('登录成功:', { userId: user.id, username: user.username });

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'user',
        token: accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('登录处理错误:', error);
    console.error('错误名称:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    // 确保错误被正确传递给错误处理中间件
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

    // 检查用户账户是否被禁用
    if (!user.isActive) {
      return next(errorFormat(403, '账户已被禁用，请联系管理员', [{ message: '账户已被禁用，请联系管理员' }], 10020));
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.tokenVersion || 0);
    user.refreshToken = refreshToken;
    await user.save();

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

    console.log('退出登录: 用户ID:', payload.id);
    const result = await User.findByIdAndUpdate(payload.id, { refreshToken: null });
    console.log('退出登录: 更新结果:', result ? '成功' : '失败');
    res.status(200).json({ success: true, message: '已退出登录' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
