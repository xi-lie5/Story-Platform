const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');

module.exports = async function authGuard(req, res, next) {
  console.log('=== AuthGuard middleware hit ==='); // 调试日志
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  console.log('Base URL:', req.baseUrl);
  console.log('Method:', req.method);
  console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
  
  // 安全日志记录（不记录敏感信息）
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  // 获取并验证令牌格式
  const authHeader = req.headers.authorization || '';
  
  // 严格验证Bearer前缀和令牌格式
  if (!authHeader.startsWith('Bearer ') || authHeader.split(' ').length !== 2) {
    console.warn('无效的认证头格式:', clientInfo);
    return next(errorFormat(401, '认证头格式无效，请使用Bearer令牌', [], 10006));
  }
  
  const token = authHeader.split(' ')[1];
  
  // 验证令牌不为空且格式合理（JWT通常包含两个点）
  if (!token || token.split('.').length !== 3) {
    console.warn('无效的令牌格式:', clientInfo);
    return next(errorFormat(401, '访问令牌格式无效', [], 10006));
  }

  try {
    // 验证令牌签名
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // 限制使用的算法
      maxAge: process.env.JWT_EXPIRES_IN || '24h' // 额外的过期时间检查
    });

    // 检查令牌是否被吊销（如果有实现令牌黑名单功能）
    // const isTokenRevoked = await TokenBlacklist.exists({ token });
    // if (isTokenRevoked) {
    //   return next(errorFormat(401, '令牌已被吊销', [], 10007));
    // }

    // 获取用户并检查状态（不包含密码）
    const user = await User.findById(decoded.id);

    if (!user) {
      console.warn('令牌关联的用户不存在:', { ...clientInfo, userId: decoded.id });
      return next(errorFormat(404, '令牌关联的用户不存在', [], 10013));
    }

    // 检查用户账户状态
    if (!user.isActive) {
      console.warn('用户账户已被禁用:', { ...clientInfo, userId: user.id });
      return next(errorFormat(403, '您的账户已被禁用，请联系管理员', [], 10005));
    }

    // 检查令牌版本（用于密码更改后强制重新登录）
    if (user.tokenVersion && decoded.tokenVersion !== user.tokenVersion) {
      console.warn('令牌版本不匹配，可能密码已更改:', { ...clientInfo, userId: user.id });
      return next(errorFormat(401, '安全验证失败，请重新登录', [], 10007));
    }

    // 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user', // 添加用户角色信息
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    // 添加令牌信息
    req.token = {
      id: decoded.jti || null,
      exp: decoded.exp,
      iat: decoded.iat
    };

    // 记录成功的认证
    if (process.env.NODE_ENV !== 'production') {
      console.info('用户认证成功:', { userId: user.id, path: req.path });
    }

    next();
  } catch (error) {
    // 记录认证错误
    console.warn('认证失败:', { ...clientInfo, error: error.name });
    
    if (error.name === 'TokenExpiredError') {
      return next(errorFormat(401, '令牌已过期，请重新登录', [], 10007));
    }
    
    if (error.name === 'JsonWebTokenError') {
      return next(errorFormat(401, '访问令牌无效或已被篡改', [], 10006));
    }

    if (error.name === 'NotBeforeError') {
      return next(errorFormat(401, '令牌尚未生效', [], 10006));
    }

    return next(errorFormat(401, '认证失败，请重新登录', [], 10006));
  }
};

// 可选的权限检查中间件
exports.checkPermission = (requiredRole = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(errorFormat(401, '请先登录', [], 10007));
    }

    // 角色权限映射（简单示例）
    const roleHierarchy = {
      user: 1,
      editor: 2,
      admin: 3
    };

    const userRoleLevel = roleHierarchy[req.user.role] || roleHierarchy.user;
    const requiredRoleLevel = roleHierarchy[requiredRole] || roleHierarchy.user;

    if (userRoleLevel < requiredRoleLevel) {
      return next(errorFormat(403, '权限不足，无法执行此操作', [], 10005));
    }

    next();
  };
};

// 可选的速率限制包装函数（可与express-rate-limit配合使用）
exports.rateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每IP限制请求数
  standardHeaders: true,
  legacyHeaders: false,
  message: errorFormat(429, '请求过于频繁，请稍后再试', [], 10009)
};