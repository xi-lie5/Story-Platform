-- Migration: 004_add_ai_mode
-- UP
SET @add_creation_mode = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stories' AND COLUMN_NAME = 'creation_mode') = 0,
  'ALTER TABLE stories ADD COLUMN creation_mode ENUM(''manual'', ''ai'') DEFAULT ''manual''',
  'SELECT 1'
);
PREPARE stmt FROM @add_creation_mode;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_ai_config = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stories' AND COLUMN_NAME = 'ai_config') = 0,
  'ALTER TABLE stories ADD COLUMN ai_config JSON',
  'SELECT 1'
);
PREPARE stmt FROM @add_ai_config;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS ai_story_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  user_id INT NOT NULL,
  context_messages JSON,
  summary TEXT,
  current_node_id VARCHAR(255),
  total_nodes INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_story_id (story_id),
  INDEX idx_user_id (user_id),
  UNIQUE KEY uk_user_story (user_id, story_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_story_characters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  personality_tags JSON,
  description TEXT,
  relationships JSON,
  avatar_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_story_id (story_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_stories (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  author_id INT NOT NULL,
  world_setting TEXT NOT NULL,
  start_prompt TEXT NOT NULL,
  outline TEXT,
  style JSON,
  mood_tags JSON,
  characters_config JSON,
  category_id INT,
  cover_image VARCHAR(255) DEFAULT '/coverImage/1.png',
  description VARCHAR(500),
  status ENUM('draft', 'published', 'unpublished') DEFAULT 'draft',
  is_public BOOLEAN DEFAULT FALSE,
  total_sessions INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_author (author_id),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- DOWN
DROP TABLE IF EXISTS ai_stories;
DROP TABLE IF EXISTS ai_story_characters;
DROP TABLE IF EXISTS ai_story_sessions;
SET @drop_ai_config = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stories' AND COLUMN_NAME = 'ai_config') > 0,
  'ALTER TABLE stories DROP COLUMN ai_config',
  'SELECT 1'
);
PREPARE stmt FROM @drop_ai_config;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_creation_mode = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stories' AND COLUMN_NAME = 'creation_mode') > 0,
  'ALTER TABLE stories DROP COLUMN creation_mode',
  'SELECT 1'
);
PREPARE stmt FROM @drop_creation_mode;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;