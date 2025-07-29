-- Add hiddenWidgets column to user_settings table for mobile widget visibility control
-- This allows users to hide/show widgets on mobile dashboard and persist the state across devices

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS hidden_widgets TEXT[];

-- Add comment to document the column purpose
COMMENT ON COLUMN user_settings.hidden_widgets IS 'Array of widget IDs that are hidden from the mobile dashboard';

-- Update any existing users to have an empty array for hidden widgets if the column was just added
UPDATE user_settings 
SET hidden_widgets = '{}' 
WHERE hidden_widgets IS NULL;