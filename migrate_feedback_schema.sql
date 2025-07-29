-- Comprehensive migration to update feedback table schema
-- This script ensures the feedback table has all necessary columns
-- Run this against your Neon database to fix the schema issues

-- Step 1: Add user_email column if it doesn't exist
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Step 2: Add title column if it doesn't exist
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Step 3: Add description column if it doesn't exist
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 4: Add GitHub integration columns if they don't exist
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Step 5: Update status column to have a default if it doesn't have one
ALTER TABLE feedback 
ALTER COLUMN status SET DEFAULT 'open';

-- Step 6: Migrate data from old columns to new columns if needed
-- Only run this if you have existing data in the old format

-- Migrate userId to user_email if user_email is empty and userId exists
UPDATE feedback 
SET user_email = "userId" 
WHERE user_email IS NULL 
  AND "userId" IS NOT NULL 
  AND user_email != "userId";

-- Migrate feedbackType and feedbackText to title if title is empty
UPDATE feedback 
SET title = COALESCE(
  CASE 
    WHEN "feedbackType" = 'bug' THEN '🐛 Bug Report: '
    WHEN "feedbackType" = 'feature' THEN '✨ Feature Request: '
    WHEN "feedbackType" = 'ui' THEN '🎨 UI Issue: '
    WHEN "feedbackType" = 'calendar' THEN '📅 Calendar Issue: '
    WHEN "feedbackType" = 'performance' THEN '⚡ Performance Issue: '
    ELSE '💬 General Feedback: '
  END || SUBSTRING("feedbackText", 1, 50) ||
  CASE WHEN LENGTH("feedbackText") > 50 THEN '...' ELSE '' END,
  'Migrated Feedback'
)
WHERE title IS NULL 
  AND "feedbackText" IS NOT NULL;

-- Migrate feedbackText to description if description is empty
UPDATE feedback 
SET description = "feedbackText"
WHERE description IS NULL 
  AND "feedbackText" IS NOT NULL;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_github_issue_number ON feedback(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN feedback.user_email IS 'User email address - consistent with other tables in the app';
COMMENT ON COLUMN feedback.title IS 'Feedback title/subject';
COMMENT ON COLUMN feedback.description IS 'Detailed feedback content';
COMMENT ON COLUMN feedback.github_issue_number IS 'GitHub issue number for tracking feedback';
COMMENT ON COLUMN feedback.github_issue_url IS 'URL to the GitHub issue for this feedback';
COMMENT ON COLUMN feedback.completed_at IS 'Timestamp when the feedback was marked as completed';
COMMENT ON COLUMN feedback.notification_sent IS 'Whether completion notification email has been sent to user';

-- Step 9: Verify the migration worked
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' 
  AND table_schema = 'public'
ORDER BY ordinal_position;