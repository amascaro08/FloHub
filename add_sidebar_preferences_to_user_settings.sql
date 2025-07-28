-- Add sidebar_preferences column to user_settings table
-- This is the correct location since user_settings is already used for user preferences in FloHub

ALTER TABLE user_settings
ADD COLUMN sidebar_preferences JSONB DEFAULT '{}';

-- Add comment to explain the column usage
COMMENT ON COLUMN user_settings.sidebar_preferences IS 'Stores user sidebar customization settings including visiblePages and order arrays';

-- Optional: Update existing users to have default preferences
UPDATE user_settings 
SET sidebar_preferences = '{
  "visiblePages": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  "order": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  "collapsed": false
}'::jsonb
WHERE sidebar_preferences = '{}' OR sidebar_preferences IS NULL;