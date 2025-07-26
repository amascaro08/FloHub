-- Add default_calendar_view column to user_settings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'default_calendar_view') THEN
        ALTER TABLE "user_settings" ADD COLUMN "default_calendar_view" varchar(10) DEFAULT 'month';
    END IF;
END $$;