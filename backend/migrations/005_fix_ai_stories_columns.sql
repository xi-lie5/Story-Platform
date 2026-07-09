-- Migration: 005_fix_ai_stories_columns
-- UP
-- The current 004 migration creates ai_stories with these columns already present.
-- This migration is kept as an explicit compatibility marker for older databases.
SELECT 1;
-- DOWN
SELECT 1;