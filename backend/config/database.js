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
    console.log('✅ MySQL数据库连接成功，字符集已设置为 utf8mb4');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    return false;
  }
}


// 初始化数据库表结构
async function initTables() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 创建users表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(30) NOT NULL UNIQUE COMMENT '用户名',
        email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱',
        password VARCHAR(255) NOT NULL COMMENT '密码',
        avatar VARCHAR(255) DEFAULT '/avatar/default.png' COMMENT '头像',
        bio VARCHAR(200) DEFAULT '这个人很懒，什么都没留下' COMMENT '个人简介',
        role ENUM('user', 'editor', 'admin') DEFAULT 'user' COMMENT '角色',
        is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
        token_version INT DEFAULT 1 COMMENT 'Token版本',
        refresh_token TEXT COMMENT '刷新令牌',
        last_login TIMESTAMP NULL COMMENT '最后登录时间',
        login_attempts INT DEFAULT 0 COMMENT '登录尝试次数',
        lock_until TIMESTAMP NULL COMMENT '锁定到期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
    `);

    // 创建categories表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE COMMENT '分类名称',
        description TEXT COMMENT '分类描述',
        story_count INT DEFAULT 0 COMMENT '故事数量',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表'
    `);

    // 创建stories表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL COMMENT '故事标题',
        author_id INT NOT NULL COMMENT '作者ID',
        category_id INT COMMENT '分类ID',
        cover_image VARCHAR(255) DEFAULT '/coverImage/1.png' COMMENT '封面图片',
        description VARCHAR(500) NOT NULL COMMENT '故事简介',
        status ENUM('draft', 'pending', 'published', 'rejected', 'unpublished') DEFAULT 'draft' COMMENT '状态',
        is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
        view_count INT DEFAULT 0 COMMENT '浏览次数',
        rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '评分',
        rating_count INT DEFAULT 0 COMMENT '评分人数',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_author (author_id),
        INDEX idx_category (category_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_updated_at (updated_at),
        FULLTEXT idx_title_desc (title, description),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='故事表'
    `);

    // 创建story_nodes表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS story_nodes (
        id VARCHAR(255) PRIMARY KEY COMMENT '节点ID',
        story_id INT NOT NULL COMMENT '故事ID',
        title VARCHAR(255) NOT NULL COMMENT '节点标题',
        content TEXT NOT NULL COMMENT '节点内容',
        is_root BOOLEAN DEFAULT FALSE COMMENT '是否根节点',
        type ENUM('regular', 'branch', 'end') DEFAULT 'regular' COMMENT '节点类型',
        x INT DEFAULT 0 COMMENT 'X坐标',
        y INT DEFAULT 0 COMMENT 'Y坐标',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_story_id (story_id),
        INDEX idx_story_root (story_id, is_root),
        INDEX idx_story_type (story_id, type),
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='故事节点表'
    `);

    // 创建branches表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(255) PRIMARY KEY COMMENT '分支ID',
        source_node_id VARCHAR(255) NOT NULL COMMENT '源节点ID',
        target_node_id VARCHAR(255) NOT NULL COMMENT '目标节点ID',
        context VARCHAR(500) NOT NULL COMMENT '分支描述',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_source_target (source_node_id, target_node_id),
        INDEX idx_source (source_node_id),
        INDEX idx_target (target_node_id),
        FOREIGN KEY (source_node_id) REFERENCES story_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES story_nodes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分支表'
    `);

    // 创建characters表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(255) PRIMARY KEY COMMENT '角色ID',
        story_id INT NOT NULL COMMENT '故事ID',
        name VARCHAR(100) NOT NULL COMMENT '角色名称',
        description VARCHAR(1000) NOT NULL COMMENT '角色描述',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_story_name (story_id, name),
        INDEX idx_story_id (story_id),
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表'
    `);

    // 创建collections表（收藏表）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        story_id INT NOT NULL COMMENT '故事ID',
        collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
        UNIQUE KEY uk_user_story (user_id, story_id),
        INDEX idx_user_id (user_id),
        INDEX idx_story_id (story_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表'
    `);

    // 创建user_story_favorites表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_story_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        story_id INT NOT NULL COMMENT '故事ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_story (user_id, story_id),
        INDEX idx_user_id (user_id),
        INDEX idx_story_id (story_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户故事收藏表'
    `);

    // 创建user_story_ratings表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_story_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        story_id INT NOT NULL COMMENT '故事ID',
        rating INT NOT NULL COMMENT '评分(1-5)',
        comment VARCHAR(500) COMMENT '评论',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_story (user_id, story_id),
        INDEX idx_user_id (user_id),
        INDEX idx_story_id (story_id),
        INDEX idx_rating (rating),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
        CHECK (rating >= 1 AND rating <= 5)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户故事评分表'
    `);

    await connection.commit();
    console.log('✅ 数据库表初始化成功');
  } catch (error) {
    await connection.rollback();
    console.error('❌ 数据库表初始化失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  initTables
};

