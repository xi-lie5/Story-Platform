const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorFormat } = require('../utils/errorFormat');

/**
 * 刷新令牌验证中间件：校验请求中的 refreshToken 是否有效
 * 验证通过后，将用户信息挂载到 req.user，供后续接口使用
 */
module.exports = async (req, res, next) => {
    let refreshToken; 
    
    // 1. 从请求体中获取 refreshToken（API 文档约定：刷新接口的 refreshToken 放在请求体）
    if (req.body && req.body.refreshToken) {
        refreshToken = req.body.refreshToken;
    }

    // 2. 检查是否提供了 refreshToken（错误码 10007：未提供令牌）
    if (!refreshToken) {
        return next(errorFormat(
            401,
            '未提供刷新令牌',
            [],
            10007
        ));
    }

    try {
        // 3. 验证 refreshToken 的签名（用 refresh 专用密钥，与 accessToken 区分）
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // 4. 根据令牌中的用户 ID 查找用户
        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user) {
            return next(errorFormat(
                404,
                '用户不存在',
                [],
                10013 // 对应 API 文档的“用户不存在”错误码
            ));
        }

        // 5. 验证 refreshToken 是否与数据库中存储的一致（防止令牌被盗用后恶意刷新）
        if (user.refreshToken !== refreshToken) {
            return next(errorFormat(
                401,
                '刷新令牌无效或已过期',
                [],
                10008 // 对应 API 文档的“令牌过期”错误码（广义包含无效）
            ));
        }

        // 6. 验证通过：将用户信息挂载到 req，供后续接口（如刷新令牌接口）使用
        req.user = {
            id: user._id,
            username: user.username
        };
        next(); // 继续执行刷新令牌的业务逻辑

    } catch (err) {
        // 处理令牌验证失败的情况（过期、签名错误等）
        if (err.name === 'TokenExpiredError') {
            // 令牌过期（错误码 10008）
            return next(errorFormat(
                401,
                '刷新令牌已过期，请重新登录',
                [],
                10008
            ));
        }
        // 其他错误（如签名错误，视为令牌无效，错误码 10007）
        return next(errorFormat(
            401,
            '刷新令牌无效',
            [],
            10007
        ));
    }
};