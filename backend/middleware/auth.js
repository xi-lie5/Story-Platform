const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');

module.exports = async (req, res, next) => {
    let token;

    // 1. 从请求头提取 accessToken（API 文档约定：令牌放在 Authorization: Bearer <token> 中）
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // 格式：Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... → 提取空格后的令牌部分
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. 检查令牌是否存在（错误码 10007：未提供令牌）
    if (!token) {
        return next(errorFormat(
            401, // HTTP 401：未授权
            '未提供访问令牌，请先登录',
            [],
            10007 // 对应 API 文档“令牌无效或未提供”
        ));
    }
    try {
        // 3. 验证 accessToken 的签名（用 refresh 专用密钥，与 accessToken 区分）
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        //判断如果用户被ban了的情况
        if (!user) {
            return next(errorFormat(
                404, // HTTP 404：用户不存在
                '令牌关联的用户不存在',
                [],
                10013 // 对应 API 文档“用户不存在”
            ));
        }
        req.user = { id: user.id, name: user.username, email: user.email };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(errorFormat(401, '令牌已过期，请重新登录', [], 10007))
        }
        // 其他错误（如签名错误、令牌被篡改，错误码 10007）
        return next(errorFormat(401,'访问令牌无效',[],10007));
    }
}