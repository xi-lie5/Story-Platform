const NodeCache = require('node-cache');

// 创建内存缓存实例，TTL设置为300秒（5分钟）
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false // 提高性能，不创建对象副本
});

/**
 * 缓存中间件 - 用于缓存API响应
 * @param {number} ttl - 缓存过期时间（秒）
 * @returns {Function} Express中间件
 */
exports.cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    // 构建缓存键（使用originalUrl确保包含完整路径，例如 /api/v1/users/4/stories）
    const cacheKey = `${req.originalUrl}_${JSON.stringify(req.query)}`;
    
    // 对于用户故事列表API，先尝试清除缓存（确保获取最新数据）
    if (req.originalUrl.includes('/users/') && req.originalUrl.includes('/stories')) {
      const userIdMatch = req.originalUrl.match(/\/users\/(\d+)\/stories/);
      if (userIdMatch && userIdMatch[1]) {
        const userId = parseInt(userIdMatch[1]);
        console.log(`[CACHE] 检测到用户故事列表请求，清除用户 ${userId} 的缓存`);
        exports.clearUserCache(userId);
      }
    }

    try {
      // 尝试从缓存获取
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return res.json({
          ...cachedData,
          fromCache: true,
          cacheTimestamp: new Date().toISOString()
        });
      }

      // 重写res.json方法以缓存响应
      const originalJson = res.json;
      res.json = function(data) {
        // 只缓存成功响应（status 200）
        if (res.statusCode === 200 && !data.error) {
          // 深拷贝数据以避免引用问题
          const dataToCache = JSON.parse(JSON.stringify(data));
          cache.set(cacheKey, dataToCache, ttl);
          console.log(`[CACHE SET] ${cacheKey}`);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('缓存中间件错误:', error);
      next(); // 即使缓存出错也继续请求
    }
  };
};

/**
 * 清除特定缓存
 * @param {string} pattern - 缓存键模式（支持通配符）
 */
exports.clearCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  
  if (matchingKeys.length > 0) {
    cache.del(matchingKeys);
    console.log(`[CACHE CLEAR] 已清除 ${matchingKeys.length} 个缓存项: ${matchingKeys.join(', ')}`);
  } else {
    console.log(`[CACHE CLEAR] 未找到匹配的缓存键: ${pattern}`);
  }
};

/**
 * 清除故事相关的所有缓存
 * @param {string} storyId - 故事ID
 */
exports.clearStoryCache = (storyId) => {
  exports.clearCache(`stories/${storyId}`);
  exports.clearCache(`story?id=${storyId}`);
  exports.clearCache('stories');
};

/**
 * 清除用户相关的所有缓存
 * @param {string|number} userId - 用户ID
 */
exports.clearUserCache = (userId) => {
  const userIdStr = String(userId);
  // 清除用户故事列表缓存（匹配 /api/v1/users/:userId/stories 的缓存键）
  exports.clearCache(`/users/${userIdStr}/stories`);
  exports.clearCache(`users/${userIdStr}/stories`);
  exports.clearCache(`user/${userIdStr}`);
  exports.clearCache('users');
  console.log(`[CACHE CLEAR] 已清除用户 ${userIdStr} 相关的所有缓存`);
};

/**
 * 获取缓存统计信息
 */
exports.getCacheStats = () => {
  return cache.getStats();
};

/**
 * 手动设置缓存
 */
exports.setCache = (key, value, ttl = 300) => {
  return cache.set(key, value, ttl);
};

/**
 * 手动获取缓存
 */
exports.getCache = (key) => {
  return cache.get(key);
};

// 导出缓存实例以便在其他地方使用
exports.cache = cache;