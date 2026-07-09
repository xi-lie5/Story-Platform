-- Migration: 007_add_read_events
-- UP
CREATE TABLE IF NOT EXISTS story_read_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  user_id INT NOT NULL,
  session_id INT NULL,
  from_node_id VARCHAR(255) NULL,
  to_node_id VARCHAR(255) NOT NULL,
  choice_text VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_story (story_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at),
  INDEX idx_story_flow (story_id, from_node_id, to_node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- DOWN
DROP TABLE IF EXISTS story_read_events;
