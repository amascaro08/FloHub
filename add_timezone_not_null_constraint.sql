-- Add NOT NULL constraint and default value to timezone column in user_settings table
-- This ensures timezone is always set and prevents it from being NULL, which causes resets to UTC

-- First, update any existing NULL timezone values to user's browser timezone or UTC as fallback
UPDATE user_settings 
SET timezone = COALESCE(timezone, 'UTC') 
WHERE timezone IS NULL;

-- Add NOT NULL constraint with default value
ALTER TABLE user_settings 
ALTER COLUMN timezone SET NOT NULL,
ALTER COLUMN timezone SET DEFAULT 'UTC';

-- Add comment for documentation
COMMENT ON COLUMN user_settings.timezone IS 'User preferred timezone (IANA timezone string). Must not be NULL to ensure persistence across sessions.';

-- Verify the change
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'timezone';