-- Migration to add GitHub issue tracking fields to feedback table
-- Run this migration to add the new fields for enhanced feedback system

-- Add GitHub issue tracking fields
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Create index for better performance when looking up feedback by GitHub issue number
CREATE INDEX IF NOT EXISTS idx_feedback_github_issue_number ON feedback(github_issue_number);

-- Create index for completed feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_completed_at ON feedback(completed_at);

-- Update existing open feedback entries to have correct status if needed
-- Note: This is optional and may not be needed depending on your current data
-- UPDATE feedback SET status = 'open' WHERE status IS NULL OR status = '';

COMMENT ON COLUMN feedback.github_issue_number IS 'GitHub issue number for tracking feedback';
COMMENT ON COLUMN feedback.github_issue_url IS 'URL to the GitHub issue for this feedback';
COMMENT ON COLUMN feedback.completed_at IS 'Timestamp when the feedback was marked as completed';
COMMENT ON COLUMN feedback.notification_sent IS 'Whether completion notification email has been sent to user';