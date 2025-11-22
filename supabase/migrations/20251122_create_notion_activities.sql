-- Create notion_activities table (mirrors github_activities structure)
-- Migration: Create Notion activities tracking table
-- Date: 2025-11-22

CREATE TABLE IF NOT EXISTS notion_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'page_edit', 'page_create', 'database_edit', 'database_create'
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL, -- last_edited_time from Notion
  url TEXT,
  provider TEXT DEFAULT 'notion' NOT NULL,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notion_activities_user_id ON notion_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_activities_occurred_at ON notion_activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notion_activities_provider ON notion_activities(provider);
CREATE INDEX IF NOT EXISTS idx_notion_activities_metadata_page_id ON notion_activities USING gin((metadata->'notion_page_id'));

-- Add comments for documentation
COMMENT ON TABLE notion_activities IS 'Stores user activity from Notion (page edits, database updates, etc.)';
COMMENT ON COLUMN notion_activities.activity_type IS 'Type of Notion activity (page_edit, page_create, database_edit, database_create)';
COMMENT ON COLUMN notion_activities.occurred_at IS 'When the activity occurred in Notion (last_edited_time)';
COMMENT ON COLUMN notion_activities.metadata IS 'JSONB field storing notion_page_id for deduplication and other Notion-specific data';
COMMENT ON COLUMN notion_activities.synced_at IS 'When this activity was last synced from Notion API';
