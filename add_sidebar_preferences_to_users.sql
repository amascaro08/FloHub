-- Alternative: Add sidebar_preferences column to users table
-- This requires updating the API to use users table instead of user_settings

ALTER TABLE users
ADD COLUMN sidebar_preferences JSONB DEFAULT '{}';

-- Add comment to explain the column usage
COMMENT ON COLUMN users.sidebar_preferences IS 'Stores user sidebar customization settings including visiblePages and order arrays';

-- Optional: Update existing users to have default preferences
UPDATE users 
SET sidebar_preferences = '{
  "visiblePages": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  "order": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  "collapsed": false
}'::jsonb
WHERE sidebar_preferences = '{}' OR sidebar_preferences IS NULL;