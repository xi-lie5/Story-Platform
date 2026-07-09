-- Migration: 001_init_core_tables
-- UP
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255) DEFAULT '/avatar/default.png',
  bio VARCHAR(200) DEFAULT '',
  role ENUM('user', 'editor', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  token_version INT DEFAULT 1,
  refresh_token TEXT,
  last_login TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  lock_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  story_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  author_id INT NOT NULL,
  category_id INT,
  cover_image VARCHAR(255) DEFAULT '/coverImage/1.png',
  description VARCHAR(500) NOT NULL,
  status ENUM('draft', 'pending', 'published', 'rejected', 'unpublished') DEFAULT 'draft',
  is_public BOOLEAN DEFAULT FALSE,
  view_count INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_author (author_id),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at),
  FULLTEXT idx_title_desc (title, description),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- DOWN
DROP TABLE IF EXISTS stories;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;