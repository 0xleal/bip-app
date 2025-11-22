-- Add Notion OAuth token fields to users table
-- Migration: Add Notion integration fields
-- Date: 2025-11-22

ALTER TABLE users
ADD COLUMN IF NOT EXISTS notion_access_token TEXT,
ADD COLUMN IF NOT EXISTS notion_bot_id TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_id TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_user_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.notion_access_token IS 'Notion OAuth access token (no expiration or refresh)';
COMMENT ON COLUMN users.notion_bot_id IS 'Notion integration bot ID from OAuth response';
COMMENT ON COLUMN users.notion_workspace_id IS 'Notion workspace ID where the integration is installed';
COMMENT ON COLUMN users.notion_workspace_name IS 'Notion workspace display name';
COMMENT ON COLUMN users.notion_workspace_user_id IS 'Notion user ID within the workspace (from bot.owner.user.id)';
