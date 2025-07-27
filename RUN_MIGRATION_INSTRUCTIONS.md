# Database Migration Instructions

## Overview
After deploying the FloHub Local Calendar feature, you need to run a database migration to update the `calendarEvents` table.

## Prerequisites
- Access to your production database
- `psql` command-line tool installed, OR
- Direct database access through your hosting provider's interface

## Option 1: Using psql (Recommended)

1. Connect to your database:
```bash
psql "$DATABASE_URL"
```

2. Copy and run the following SQL commands:

```sql
-- Add new columns to the calendarEvents table
DO $$ 
BEGIN
    -- Add user_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'user_email') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "user_email" varchar(255);
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'description') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "description" text;
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'location') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "location" text;
    END IF;
    
    -- Add calendar_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'calendar_id') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "calendar_id" varchar(255) DEFAULT 'flohub_local';
    END IF;
    
    -- Add source column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'source') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "source" varchar(50) DEFAULT 'personal';
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'tags') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "tags" text[];
    END IF;
    
    -- Add is_recurring column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'is_recurring') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "is_recurring" boolean DEFAULT false;
    END IF;
    
    -- Add series_master_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'series_master_id') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "series_master_id" text;
    END IF;
    
    -- Add instance_index column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'instance_index') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "instance_index" integer;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'created_at') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'updated_at') THEN
        ALTER TABLE "calendarEvents" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();
    END IF;
    
    -- Migrate userId to user_email if userId column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendarEvents' AND column_name = 'userId') THEN
        -- Try to populate user_email from users table
        UPDATE "calendarEvents" 
        SET "user_email" = u.email 
        FROM users u 
        WHERE "calendarEvents"."userId"::integer = u.id 
        AND "calendarEvents"."user_email" IS NULL;
        
        -- Drop the old userId column after migration
        ALTER TABLE "calendarEvents" DROP COLUMN IF EXISTS "userId";
    END IF;
    
    -- Make end column nullable if it's not already
    ALTER TABLE "calendarEvents" ALTER COLUMN "end" DROP NOT NULL;
    
    -- Make user_email NOT NULL after data migration
    ALTER TABLE "calendarEvents" ALTER COLUMN "user_email" SET NOT NULL;
    
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_email ON "calendarEvents" ("user_email");
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON "calendarEvents" ("calendar_id");
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON "calendarEvents" USING GIN ("start");
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_at ON "calendarEvents" ("created_at");

-- Update default values for existing rows
UPDATE "calendarEvents" 
SET 
    "calendar_id" = COALESCE("calendar_id", 'flohub_local'),
    "source" = COALESCE("source", 'personal'),
    "is_recurring" = COALESCE("is_recurring", false),
    "created_at" = COALESCE("created_at", now()),
    "updated_at" = COALESCE("updated_at", now())
WHERE "calendar_id" IS NULL OR "source" IS NULL OR "is_recurring" IS NULL OR "created_at" IS NULL OR "updated_at" IS NULL;

COMMIT;
```

## Option 2: Using Hosting Provider Interface

If you're using Vercel, Railway, or another hosting provider:

1. Go to your database dashboard
2. Open the SQL console/query editor
3. Copy and paste the SQL commands from Option 1
4. Execute the migration

## Option 3: Using the Migration Script File

If you have the project files locally with database access:

```bash
cd scripts
psql "$DATABASE_URL" -f migrate_calendar_events.sql
```

## Verification

After running the migration, verify it worked by checking:

1. **Database structure**: The `calendarEvents` table should have the new columns
2. **Application**: Go to Calendar page → Add Event → "🏠 FloHub Local" should appear in the dropdown
3. **Functionality**: Try creating a local event to ensure it works

## Rollback (if needed)

If you need to rollback, the migration is designed to be safe and non-destructive. Existing data is preserved, and you can simply:

1. Remove the new columns if needed
2. The original functionality will continue to work

## Support

If you encounter any issues:

1. Check that the DATABASE_URL is correct
2. Verify you have sufficient database permissions
3. Check the application logs for errors
4. Contact support with the specific error message

## Expected Outcome

After successful migration:
- ✅ Calendar page loads even without external calendar connections
- ✅ "FloHub Local" appears as a calendar option
- ✅ Users can create, edit, and delete local events
- ✅ Local events appear in calendar views and widgets
- ✅ All existing calendar functionality (Google, O365, iCal) continues to work