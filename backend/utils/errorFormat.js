/**
 * 统一错误格式工具函数
 * @param {number} statusCode - HTTP状态码（如400、401、404）
 * @param {string} message - 错误提示信息（如“用户名已存在”）
 * @param {array} errors - 字段级错误详情（可选，如[{field: 'email', message: '格式错误'}]）
 * @param {number} code - 业务错误码（可选，如10001表示用户名已存在）
 * @returns {Error} - 格式化后的错误对象
 */
const errorFormat = (statusCode, message, errors = [], code = null) => {
  const error = new Error(message);
  // 自定义属性，供全局错误中间件使用
  error.statusCode = statusCode; // HTTP状态码
  error.errors = errors; // 字段级错误详情（可选）
  error.code = code; // 业务错误码（可选，对应API文档的错误码）
  return error;
};

module.exports = { errorFormat };