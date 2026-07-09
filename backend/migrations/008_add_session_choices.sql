-- Migration: 008_add_session_choices
-- 为 AI 故事会话表添加 current_choices 列，用于存储当前节点的待选分支
-- 这样选项不再需要创建空的占位节点，从根本上消除阅读时的"无关节点"问题
-- UP
SET @add_current_choices = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_story_sessions' AND COLUMN_NAME = 'current_choices') = 0,
  'ALTER TABLE ai_story_sessions ADD COLUMN current_choices JSON',
  'SELECT 1'
);
PREPARE stmt FROM @add_current_choices;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- DOWN
SET @drop_current_choices = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_story_sessions' AND COLUMN_NAME = 'current_choices') > 0,
  'ALTER TABLE ai_story_sessions DROP COLUMN current_choices',
  'SELECT 1'
);
PREPARE stmt FROM @drop_current_choices;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
