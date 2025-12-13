// middleware/role.js
const { errorFormat } = require('../utils/errorFormat');

// 集中配置
const ROLE = {
  ADMIN:  'admin',
  EDITOR: 'editor',
};

const ERR = {
  NEED_LOGIN:  errorFormat(401, '请先登录', [], 10007),
  FORBIDDEN:   errorFormat(403, '权限不足', [], 10005),
};

/* 1. 登录守卫 */
const loginGuard = (req, _res, next) =>
  req.user ? next() : next(ERR.NEED_LOGIN);

/* 2. 通用角色守卫工厂 */
const roleGuard = (allowedRoles) => {
  return (req, _res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(ERR.FORBIDDEN);
    }
    next();
  };
};

/* 3. 导出组合后的中间件 */
module.exports = {
  loginGuard,
  adminGuard:  [loginGuard, roleGuard([ROLE.ADMIN])],
  editorGuard: [loginGuard, roleGuard([ROLE.ADMIN, ROLE.EDITOR])],
};