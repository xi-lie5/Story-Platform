const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量（从backend目录加载.env）
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'story_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // 设置字符集，确保UUID等字符串正确存储
  charset: 'utf8mb4'
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    // 确保连接使用正确的字符集
    await connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.query('SET CHARACTER SET utf8mb4');
    console.log('MySQL数据库连接成功，字符集已设置为 utf8mb4');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL数据库连接失败:', error.message);
    return false;
  }
}

// 注意：数据库表结构由 db/migrate.js 通过 migrations/*.sql 管理。
// 此文件仅负责连接池和连接测试。
// 历史的 initTables() / createAiStoryTables() / createAiStoriesTable() 已废弃并删除。

module.exports = {
  pool,
  testConnection
};
