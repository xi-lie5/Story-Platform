const mongoose = require('mongoose');

module.exports = (err, req, res, next) => {
    // 默认错误配置
    let statusCode = err.statusCode || 500;
    let message = err.message || '服务器内部错误';
    let errors = err.errors || [];
    let code = err.code || null;

    // 开发环境打印详细错误信息
    if (process.env.NODE_ENV !== 'production') {
        console.error('错误详情:', {
            statusCode,
            message,
            code,
            stack: err.stack,
            originalError: err.originalError || null
        });
    }

    // 处理特定类型的错误
    
    // 1. Mongoose 验证错误
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = '数据验证失败';
        errors = Object.values(err.errors).map(error => ({
            field: error.path,
            message: error.message
        }));
        code = 10001;
    }

    // 2. MongoDB 重复键错误
    if (err.code === 11000 && err.name === 'MongoError') {
        statusCode = 400;
        const duplicateField = Object.keys(err.keyValue)[0];
        message = `数据冲突：${duplicateField} 字段的值已存在`;
        errors = [{ field: duplicateField, message: `${duplicateField} 字段的值已存在` }];
        code = 10003;
    }

    // 3. JWT 错误
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = '无效的认证令牌';
        code = 10006;
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = '认证令牌已过期';
        code = 10007;
    }

    // 4. 数据库错误
    if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
        statusCode = 500;
        message = '数据库连接错误';
        code = 10004;
        // 生产环境不暴露具体数据库错误
        if (process.env.NODE_ENV === 'production') {
            errors = [];
        }
    }

    // 5. 文件上传错误
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = '文件大小超过限制';
        code = 10008;
    }

    // 6. 无效的MongoDB ID
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 400;
        message = `无效的ID格式：${err.value}`;
        code = 10002;
    }

    // 7. 权限错误
    if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = '没有权限执行此操作';
        code = 10005;
    }

    // 构建安全的响应
    const response = {
        success: false,
        message,
        ...(errors.length > 0 && { errors }),
        ...(code && { code }),
        // 添加错误时间戳，但不包含其他敏感信息
        timestamp: new Date().toISOString()
    };

    // 安全头部设置
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // 返回错误响应
    res.status(statusCode).json(response);
};