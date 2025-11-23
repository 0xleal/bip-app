-- Add Twitter tone of voice column to users table
-- Migration: Add Twitter tone of voice storage
-- Date: 2025-11-22

-- Add column to store the generated tone of voice guide as JSONB
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_tone_of_voice JSONB DEFAULT NULL;

-- Add column to track when the tone of voice was last updated
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_tone_of_voice_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for querying users with tone of voice
CREATE INDEX IF NOT EXISTS idx_users_twitter_tone_of_voice ON users USING gin(twitter_tone_of_voice);

-- Add comments for documentation
COMMENT ON COLUMN users.twitter_tone_of_voice IS 'JSONB field storing the analyzed Twitter tone of voice guide generated from user tweets';
COMMENT ON COLUMN users.twitter_tone_of_voice_updated_at IS 'Timestamp when the Twitter tone of voice was last generated or updated';
