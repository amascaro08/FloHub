-- Add layouts column to user_settings table if it doesn't exist
-- This script is safe to run multiple times

DO $$
BEGIN
    -- Check if the layouts column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'layouts'
    ) THEN
        -- Add the layouts column
        ALTER TABLE user_settings 
        ADD COLUMN layouts JSONB;
        
        RAISE NOTICE 'Added layouts column to user_settings table';
    ELSE
        RAISE NOTICE 'layouts column already exists in user_settings table';
    END IF;
END $$;