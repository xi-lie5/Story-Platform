const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');

module.exports = async function authGuard(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(errorFormat(401, '未提供访问令牌，请先登录', [], 10007));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(errorFormat(404, '令牌关联的用户不存在', [], 10013));
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(errorFormat(401, '令牌已过期，请重新登录', [], 10007));
    }

    return next(errorFormat(401, '访问令牌无效', [], 10007));
  }
};