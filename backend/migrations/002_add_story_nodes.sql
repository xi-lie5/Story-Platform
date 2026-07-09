-- Migration: 002_add_story_nodes
-- UP
CREATE TABLE IF NOT EXISTS story_nodes (
  id VARCHAR(255) PRIMARY KEY,
  story_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_root BOOLEAN DEFAULT FALSE,
  type ENUM('regular', 'branch', 'end') DEFAULT 'regular',
  x INT DEFAULT 0,
  y INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_story_id (story_id),
  INDEX idx_story_root (story_id, is_root),
  INDEX idx_story_type (story_id, type),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(255) PRIMARY KEY,
  source_node_id VARCHAR(255) NOT NULL,
  target_node_id VARCHAR(255) NOT NULL,
  context VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_source_target (source_node_id, target_node_id),
  INDEX idx_source (source_node_id),
  INDEX idx_target (target_node_id),
  FOREIGN KEY (source_node_id) REFERENCES story_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES story_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS characters (
  id VARCHAR(255) PRIMARY KEY,
  story_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_story_name (story_id, name),
  INDEX idx_story_id (story_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- DOWN
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS story_nodes;