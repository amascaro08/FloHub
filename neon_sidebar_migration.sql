-- Neon-compatible SQL migration for sidebar preferences
-- Run this in your Neon SQL Editor

-- Step 1: Add the sidebar_preferences column
ALTER TABLE user_settings ADD COLUMN sidebar_preferences JSONB DEFAULT '{}';

-- Step 2: Update existing users with default preferences (optional)
UPDATE user_settings 
SET sidebar_preferences = '{"visiblePages": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"], "order": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"], "collapsed": false}'
WHERE sidebar_preferences = '{}' OR sidebar_preferences IS NULL;