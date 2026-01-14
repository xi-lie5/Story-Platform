/**
 * ID验证工具
 * 用于验证MySQL的整数ID和UUID格式的字符串ID
 */

/**
 * 验证是否为有效的整数ID
 * @param {*} id - 要验证的ID
 * @returns {Boolean} 是否为有效的整数ID
 */
function isValidIntegerId(id) {
  if (id === null || id === undefined) {
    return false;
  }
  const numId = Number(id);
  return Number.isInteger(numId) && numId > 0;
}

/**
 * 验证是否为有效的UUID格式字符串ID
 * @param {*} id - 要验证的ID
 * @returns {Boolean} 是否为有效的UUID格式ID
 */
function isValidStringId(id) {
  if (typeof id !== 'string') {
    return false;
  }
  // UUID格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 验证ID（支持整数和UUID）
 * @param {*} id - 要验证的ID
 * @param {String} type - ID类型: 'integer' | 'string' | 'both'
 * @returns {Boolean} 是否为有效的ID
 */
function isValidId(id, type = 'both') {
  if (type === 'integer') {
    return isValidIntegerId(id);
  } else if (type === 'string') {
    return isValidStringId(id);
  } else {
    return isValidIntegerId(id) || isValidStringId(id);
  }
}

module.exports = {
  isValidIntegerId,
  isValidStringId,
  isValidId
};


