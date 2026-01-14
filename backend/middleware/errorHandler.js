// 移除mongoose依赖，使用MySQL后不再需要

module.exports = (err, req, res, next) => {
    // 确保响应头还没有发送
    if (res.headersSent) {
        return next(err);
    }
    
    console.log('!!!!!!!!!! ERROR HANDLER CALLED !!!!!!!!!!');
    console.log('Error message:', err.message);
    console.log('Error name:', err.name);
    console.log('Error stack:', err.stack);
    
    // 默认错误配置
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || '服务器内部错误';
    let errors = err.errors || [];
    let code = err.code || null;

    // 添加调试信息
    console.log('=== 错误处理中间件调试 ===');
    console.log('请求URL:', req.url);
    console.log('请求方法:', req.method);
    console.log('错误信息:', message);
    console.log('错误堆栈:', err.stack);
    console.log('========================');

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

    // 2. MySQL 重复键错误
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 400;
        const match = err.message.match(/Duplicate entry .+ for key '(.+)'/);
        const duplicateField = match ? match[1] : 'unknown';
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

    // 4. MySQL 数据库错误
    // 注意：err.code 可能是数字（业务错误码，如10006）或字符串（MySQL错误码，如'ER_DUP_ENTRY'）
    // 只有当它是字符串且以 'ER_' 开头时，才是MySQL数据库错误
    if (err.code && typeof err.code === 'string' && err.code.indexOf('ER_') === 0) {
        statusCode = 500;
        message = '数据库操作错误';
        code = 10004;
        // 生产环境不暴露具体数据库错误
        if (process.env.NODE_ENV === 'production') {
            errors = [];
        } else {
            errors = [{ message: err.message }];
        }
    }
    
    // MySQL连接错误（err.code 可能是字符串类型的错误码）
    if (err.code && typeof err.code === 'string' && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        statusCode = 500;
        message = '数据库连接错误';
        code = 10004;
        if (process.env.NODE_ENV === 'production') {
            errors = [];
        }
    }
    
    // MySQL fatal 错误
    if (err.fatal === true) {
        statusCode = 500;
        message = '数据库连接错误';
        code = 10004;
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

    // 6. 无效的ID格式
    if (err.name === 'CastError' || (err.message && err.message.includes('无效的ID'))) {
        statusCode = 400;
        message = err.message || '无效的ID格式';
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

    // 调试：打印响应内容
    console.log('=== 准备发送的响应 ===');
    console.log('Response JSON:', JSON.stringify(response, null, 2));
    console.log('Response string length:', JSON.stringify(response).length);
    console.log('========================');

    // 安全头部设置
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 返回错误响应
    res.status(statusCode).json(response);
};