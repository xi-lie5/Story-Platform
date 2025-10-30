module.exports = (err, req, res, next) => {
    // 默认错误配置
    const statusCode = err.statusCode || 500;
    const message = err.message || '服务器内部错误';
    const errors = err.errors || [];
    const code = err.code || null; // API文档的错误码

    // 匹配API的错误响应格式
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors.length > 0 && { errors }), // 有字段错误才返回errors
        ...(code && { code }) // 有错误码才返回code
    });
};