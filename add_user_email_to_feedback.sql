-- Migration to add user_email column to feedback table for consistency with other tables
-- This makes feedback table consistent with tasks, notes, userSettings, etc.

-- Step 1: Add the new user_email column
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);

-- Step 3: If there's existing data with user_id as UUID, you might need to map it
-- For now, we'll leave existing data as-is and new records will use user_email
-- If you need to migrate existing data, you'd need a mapping table or manual update

-- Step 4: Add comments for clarity
COMMENT ON COLUMN feedback.user_email IS 'User email address - consistent with other tables in the app';
COMMENT ON COLUMN feedback.user_id IS 'Legacy user ID field - use user_email for new records';