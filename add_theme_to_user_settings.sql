-- Add theme field to user_settings table with proper constraints
ALTER TABLE user_settings 
ADD COLUMN theme VARCHAR(10) DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto'));

-- Update existing records to have 'auto' as default theme
UPDATE user_settings 
SET theme = 'auto' 
WHERE theme IS NULL;

-- Add index for theme field for better query performance
CREATE INDEX idx_user_settings_theme ON user_settings(theme);

-- Add comment for documentation
COMMENT ON COLUMN user_settings.theme IS 'User theme preference: light, dark, or auto (follows system)';