-- Add all journal settings columns to user_settings table
-- This will ensure journal settings persist properly instead of reverting back
-- Based on existing user_settings schema with user_email as primary key

-- Journal reminder settings
ALTER TABLE user_settings 
ADD COLUMN journal_reminder_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE user_settings 
ADD COLUMN journal_reminder_time TIME DEFAULT '20:00';

-- Journal security settings
ALTER TABLE user_settings 
ADD COLUMN journal_pin_protection BOOLEAN DEFAULT FALSE;

ALTER TABLE user_settings 
ADD COLUMN journal_pin_hash VARCHAR(255);

-- Journal export and behavior settings
ALTER TABLE user_settings 
ADD COLUMN journal_export_format VARCHAR(10) DEFAULT 'json';

ALTER TABLE user_settings 
ADD COLUMN journal_auto_save BOOLEAN DEFAULT TRUE;

-- Journal feature toggles
ALTER TABLE user_settings 
ADD COLUMN journal_daily_prompts BOOLEAN DEFAULT TRUE;

ALTER TABLE user_settings 
ADD COLUMN journal_mood_tracking BOOLEAN DEFAULT TRUE;

ALTER TABLE user_settings 
ADD COLUMN journal_activity_tracking BOOLEAN DEFAULT TRUE;

ALTER TABLE user_settings 
ADD COLUMN journal_sleep_tracking BOOLEAN DEFAULT TRUE;

ALTER TABLE user_settings 
ADD COLUMN journal_weekly_reflections BOOLEAN DEFAULT FALSE;

-- Custom activities (main feature from the request)
ALTER TABLE user_settings 
ADD COLUMN journal_custom_activities JSONB DEFAULT '[]'::jsonb;

-- Add check constraints
ALTER TABLE user_settings 
ADD CONSTRAINT check_journal_export_format 
CHECK (journal_export_format IN ('json', 'csv'));

ALTER TABLE user_settings 
ADD CONSTRAINT check_journal_custom_activities_structure 
CHECK (
  journal_custom_activities IS NULL OR 
  (
    jsonb_typeof(journal_custom_activities) = 'array' AND
    (
      jsonb_array_length(journal_custom_activities) = 0 OR
      (
        SELECT bool_and(
          jsonb_typeof(elem) = 'object' AND
          elem ? 'name' AND
          elem ? 'icon' AND
          jsonb_typeof(elem->'name') = 'string' AND
          jsonb_typeof(elem->'icon') = 'string'
        )
        FROM jsonb_array_elements(journal_custom_activities) AS elem
      )
    )
  )
);

-- Add indexes for performance (using user_email which is the actual column name)
CREATE INDEX idx_user_settings_journal_reminder ON user_settings(user_email, journal_reminder_enabled);
CREATE INDEX idx_user_settings_journal_features ON user_settings(user_email, journal_mood_tracking, journal_activity_tracking, journal_sleep_tracking);

-- Add comments to document the columns
COMMENT ON COLUMN user_settings.journal_reminder_enabled IS 'Whether daily journal reminders are enabled';
COMMENT ON COLUMN user_settings.journal_reminder_time IS 'Time for daily journal reminder notifications';
COMMENT ON COLUMN user_settings.journal_pin_protection IS 'Whether PIN protection is enabled for journal access';
COMMENT ON COLUMN user_settings.journal_pin_hash IS 'Hashed PIN for journal protection';
COMMENT ON COLUMN user_settings.journal_export_format IS 'Preferred format for journal data export (json or csv)';
COMMENT ON COLUMN user_settings.journal_auto_save IS 'Whether to automatically save journal entries as user types';
COMMENT ON COLUMN user_settings.journal_daily_prompts IS 'Whether to show daily writing prompts';
COMMENT ON COLUMN user_settings.journal_mood_tracking IS 'Whether mood tracking is enabled';
COMMENT ON COLUMN user_settings.journal_activity_tracking IS 'Whether activity tracking is enabled';
COMMENT ON COLUMN user_settings.journal_sleep_tracking IS 'Whether sleep tracking is enabled';
COMMENT ON COLUMN user_settings.journal_weekly_reflections IS 'Whether weekly reflection prompts are enabled';
COMMENT ON COLUMN user_settings.journal_custom_activities IS 'JSON array of user-defined custom activities with name and icon properties';

-- Example of the JSON structure for custom activities:
-- [
--   {"name": "Yoga", "icon": "🧘"},
--   {"name": "Coding", "icon": "💻"},
--   {"name": "Gardening", "icon": "🌱"},
--   {"name": "Photography", "icon": "📸"}
-- ]