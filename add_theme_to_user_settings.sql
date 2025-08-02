-- Add theme field to user_settings table
ALTER TABLE user_settings 
ADD COLUMN theme VARCHAR(10) DEFAULT 'auto';

-- Update existing records to have 'auto' as default theme
UPDATE user_settings 
SET theme = 'auto' 
WHERE theme IS NULL;