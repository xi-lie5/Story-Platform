const { errorFormat } = require('../utils/errorFormat');

/**
 * 管理员权限验证中间件
 * 检查用户是否具有管理员权限
 */
const adminGuard = (req, res, next) => {
  if (!req.user) {
    return next(errorFormat(401, '请先登录', [], 10007));
  }

  if (req.user.role !== 'admin') {
    return next(errorFormat(403, '权限不足，需要管理员权限', [], 10005));
  }

  next();
};

/**
 * 编辑者权限验证中间件
 * 检查用户是否具有编辑者或管理员权限
 */
const editorGuard = (req, res, next) => {
  if (!req.user) {
    return next(errorFormat(401, '请先登录', [], 10007));
  }

  if (!['admin', 'editor'].includes(req.user.role)) {
    return next(errorFormat(403, '权限不足，需要编辑者或管理员权限', [], 10005));
  }

  next();
};

module.exports = {
  adminGuard,
  editorGuard
};