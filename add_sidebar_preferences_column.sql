-- Add sidebar_preferences column to users table
-- This column will store user customization settings for the sidebar
-- including visible pages and their order

ALTER TABLE users
ADD COLUMN sidebar_preferences JSONB DEFAULT '{}';

-- Add comment to explain the column usage
COMMENT ON COLUMN users.sidebar_preferences IS 'Stores user sidebar customization settings including visiblePages and order arrays';

-- Example structure:
-- {
--   "visiblePages": ["Hub", "Tasks", "Notes", "Calendar"],
--   "order": ["Hub", "Notes", "Tasks", "Calendar"],
--   "collapsed": false
-- }