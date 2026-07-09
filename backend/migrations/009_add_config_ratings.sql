-- Migration: 009_add_config_ratings
-- UP
CREATE TABLE IF NOT EXISTS ai_config_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_config (config_id, user_id),
  INDEX idx_config (config_id),
  INDEX idx_user (user_id),
  FOREIGN KEY (config_id) REFERENCES ai_stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- DOWN
DROP TABLE IF EXISTS ai_config_ratings;
