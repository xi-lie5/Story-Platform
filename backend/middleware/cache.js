const NodeCache = require('node-cache');

// 尝试使用 structuredClone（Node.js >= 17），否则回退到 JSON 方式
const safeClone = (obj) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (e) {
      console.warn('structuredClone failed, fallback to JSON clone:', e.message);
    }
  }
  // Fallback: JSON clone（注意：会丢失 undefined、函数、Date 变字符串等）
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to clone response data for caching:', e.message);
    return null;
  }
};

// 创建内存缓存实例
const cache = new NodeCache({
  stdTTL: 300,        // 默认 5 分钟
  checkperiod: 60,    // 每分钟检查过期
  useClones: false    // 不自动克隆，我们自己控制
});

/**
 * 构建稳定、规范的缓存键
 * @param {string} originalUrl - req.originalUrl
 * @param {Object} query - req.query
 * @returns {string} 规范化后的缓存键，如 "GET:/api/v1/stories?page=1&limit=10"
 */
function buildCacheKey(originalUrl, query = {}) {
  // 【关键】只允许影响业务结果的查询参数（按需调整）
  const allowedParams = ['page', 'limit', 'category', 'author', 'search', 'status', 'sortBy'];

  const cleanQuery = {};
  for (const key of allowedParams) {
    if (query[key] !== undefined && query[key] !== '') {
      // 保留原始值（可选：做类型校验或标准化）
      cleanQuery[key] = query[key];
    }
  }

  // 按 key 字典序排序，确保相同参数组合生成相同字符串
  const sortedKeys = Object.keys(cleanQuery).sort();
  let queryString = '';
  if (sortedKeys.length > 0) {
    queryString = sortedKeys
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(cleanQuery[k])}`)
      .join('&');
  }

  // 提取路径部分（移除原始 URL 中可能存在的查询字符串）
  const urlPath = originalUrl.split('?')[0];
  const fullUrl = queryString ? `${urlPath}?${queryString}` : urlPath;

  return `GET:${fullUrl}`;
}

/**
 * 缓存中间件 - 用于缓存API响应
 * @param {number} ttl - 缓存过期时间（秒）
 * @returns {Function} Express中间件
 */
exports.cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }


    // 👇 新增：打印原始请求信息（用于调试）
    console.log('--- Incoming Request ---');
    console.log('URL:', req.originalUrl);
    console.log('Query:', req.query);



    const cacheKey = buildCacheKey(req.originalUrl, req.query);

    // 👇 新增：打印最终生成的 cacheKey
    console.log('Generated cacheKey:', cacheKey);
    console.log('------------------------');



    try {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return res.json({
          ...cachedData,
          fromCache: true,
          cacheTimestamp: new Date().toISOString()
        });
      }

      // 重写 res.json 以捕获响应并缓存
      const originalJson = res.json;
      res.json = function (data) {
        if (res.statusCode === 200 && !data?.error) {
          const clonedData = safeClone(data);
          if (clonedData !== null) {
            cache.set(cacheKey, clonedData, ttl);
            console.log(`[CACHE SET] ${cacheKey}`);
          }
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('缓存中间件错误:', error);
      next();
    }
  };
};

/**
 * 按前缀清除缓存（推荐方式）
 * @param {string} prefix - 缓存键前缀，如 "GET:/api/v1/stories"
 */
exports.clearCacheByPrefix = (prefix) => {
  const allKeys = cache.keys();
  const matchingKeys = allKeys.filter(key => key.startsWith(prefix));
  if (matchingKeys.length > 0) {
    cache.del(matchingKeys);
    console.log(`[CACHE CLEAR] 已清除前缀 "${prefix}" 下 ${matchingKeys.length} 个缓存项`);
  }
};

/**
 * 清除故事相关缓存
 */
exports.clearStoryCache = () => {
  exports.clearCacheByPrefix('GET:/api/v1/stories');
  exports.clearCacheByPrefix('GET:/api/v1/story');
};

/**
 * 清除用户相关缓存
 */
exports.clearUserCache = (userId) => {
  exports.clearCacheByPrefix('GET:/api/v1/user');
  exports.clearCacheByPrefix('GET:/api/v1/users');
};

/**
 * 获取缓存统计信息
 */
exports.getCacheStats = () => {
  return cache.getStats();
};

/**
 * 手动设置缓存（高级用法）
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

// 导出实例
exports.cache = cache;