-- Migration: Add notes_grouping column to user_settings table
-- This column stores the user's preferred grouping option for the notes page
-- Date: 2024
-- 
-- Description:
-- Adds a new column `notes_grouping` to the `user_settings` table to persist
-- the user's preferred notes grouping option across sessions.

-- Add the notes_grouping column
ALTER TABLE user_settings 
ADD COLUMN notes_grouping VARCHAR(10) DEFAULT 'month';

-- Add a check constraint to ensure only valid grouping options are stored
ALTER TABLE user_settings 
ADD CONSTRAINT check_notes_grouping 
CHECK (notes_grouping IN ('month', 'date', 'tag', 'week', 'none'));

-- Add a comment to document the column
COMMENT ON COLUMN user_settings.notes_grouping IS 'User preference for notes grouping: month, date, tag, week, or none';

-- Update any existing records to have the default value (in case there are NULL values)
UPDATE user_settings 
SET notes_grouping = 'month' 
WHERE notes_grouping IS NULL;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name = 'notes_grouping';

-- Check if constraint was added successfully
SELECT 
  constraint_name, 
  constraint_type, 
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_notes_grouping';

-- Test the constraint (optional - remove these lines after testing)
-- This should succeed:
-- INSERT INTO user_settings (user_email, notes_grouping) VALUES ('test@example.com', 'tag');
-- DELETE FROM user_settings WHERE user_email = 'test@example.com';

-- This should fail:
-- INSERT INTO user_settings (user_email, notes_grouping) VALUES ('test@example.com', 'invalid');

COMMIT;