-- Migration: Fix duplicate Notion activities and add unique constraint
-- Date: 2025-11-22
-- Purpose: Ensure only one entry per page per user, keep the latest edit

-- Step 1: Remove duplicate entries, keeping only the most recent one per page
-- This CTE finds duplicates and keeps the one with the latest occurred_at
WITH duplicates AS (
  SELECT
    id,
    user_id,
    metadata->>'notion_page_id' as notion_page_id,
    occurred_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, metadata->>'notion_page_id'
      ORDER BY occurred_at DESC, created_at DESC
    ) as rn
  FROM notion_activities
  WHERE metadata->>'notion_page_id' IS NOT NULL
)
DELETE FROM notion_activities
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Create a unique index to prevent future duplicates
-- This ensures one entry per (user_id, notion_page_id) combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_notion_activities_unique_page_per_user
ON notion_activities(user_id, (metadata->>'notion_page_id'))
WHERE metadata->>'notion_page_id' IS NOT NULL;

-- Add comment
COMMENT ON INDEX idx_notion_activities_unique_page_per_user IS
'Ensures only one activity entry per Notion page per user. Duplicates are prevented at the database level.';
