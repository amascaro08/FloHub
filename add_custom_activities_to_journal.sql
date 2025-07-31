-- Option 3: Add to journal table if you want to store custom activities 
-- that are specific to journal functionality rather than global user settings

-- First, let's see what the current journal table structure might be
-- This assumes there's already a journal or journal_entries table

-- Add custom_activities column to journal settings or create journal_settings table
CREATE TABLE IF NOT EXISTS journal_settings (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  custom_activities JSONB DEFAULT '[]'::jsonb,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_time TIME DEFAULT '20:00',
  pin_protection BOOLEAN DEFAULT FALSE,
  pin_hash VARCHAR(255),
  export_format VARCHAR(10) DEFAULT 'json',
  auto_save BOOLEAN DEFAULT TRUE,
  daily_prompts BOOLEAN DEFAULT TRUE,
  mood_tracking BOOLEAN DEFAULT TRUE,
  activity_tracking BOOLEAN DEFAULT TRUE,
  sleep_tracking BOOLEAN DEFAULT TRUE,
  weekly_reflections BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_journal_settings_user_email 
    FOREIGN KEY (user_email) 
    REFERENCES users(email) 
    ON DELETE CASCADE,
    
  -- JSON structure validation
  CONSTRAINT check_custom_activities_structure 
  CHECK (
    custom_activities IS NULL OR 
    (
      jsonb_typeof(custom_activities) = 'array' AND
      (
        jsonb_array_length(custom_activities) = 0 OR
        (
          SELECT bool_and(
            jsonb_typeof(elem) = 'object' AND
            elem ? 'name' AND
            elem ? 'icon' AND
            jsonb_typeof(elem->'name') = 'string' AND
            jsonb_typeof(elem->'icon') = 'string'
          )
          FROM jsonb_array_elements(custom_activities) AS elem
        )
      )
    )
  )
);

-- Add indexes
CREATE INDEX idx_journal_settings_user_email ON journal_settings(user_email);

-- Add comments
COMMENT ON TABLE journal_settings IS 'Journal-specific settings and preferences for each user';
COMMENT ON COLUMN journal_settings.custom_activities IS 'JSON array of user-defined activities with name and icon';

-- Update timestamp trigger
CREATE TRIGGER update_journal_settings_updated_at
    BEFORE UPDATE ON journal_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();