-- Migration to enhance calendar_events table for Power Automate integration
-- This adds missing columns and improves indexing for external event storage

-- Add missing columns for Power Automate events
ALTER TABLE "calendarEvents" 
ADD COLUMN IF NOT EXISTS "event_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "user_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS "recurrence" JSONB,
ADD COLUMN IF NOT EXISTS "external_id" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "external_source" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(50) DEFAULT 'synced';

-- Add comments to document the new columns
COMMENT ON COLUMN "calendarEvents"."event_id" IS 'Unique identifier for the event from external source';
COMMENT ON COLUMN "calendarEvents"."user_id" IS 'User identifier (alternative to user_email for consistency)';
COMMENT ON COLUMN "calendarEvents"."last_updated" IS 'Timestamp when event was last updated from external source';
COMMENT ON COLUMN "calendarEvents"."recurrence" IS 'Recurrence pattern data for recurring events';
COMMENT ON COLUMN "calendarEvents"."external_id" IS 'Original ID from external calendar system';
COMMENT ON COLUMN "calendarEvents"."external_source" IS 'Source system identifier (e.g., "powerautomate", "google", "office365")';
COMMENT ON COLUMN "calendarEvents"."sync_status" IS 'Status of sync with external source (synced, pending, error)';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_calendar_events_event_id" ON "calendarEvents" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_user_id" ON "calendarEvents" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_external_id" ON "calendarEvents" ("external_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_external_source" ON "calendarEvents" ("external_source");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_sync_status" ON "calendarEvents" ("sync_status");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_last_updated" ON "calendarEvents" ("last_updated");

-- Create composite index for efficient upserts
CREATE INDEX IF NOT EXISTS "idx_calendar_events_user_external" ON "calendarEvents" ("user_email", "external_id", "external_source");

-- Create unique constraint to prevent duplicate events from same external source
CREATE UNIQUE INDEX IF NOT EXISTS "idx_calendar_events_unique_external" 
ON "calendarEvents" ("user_email", "external_id", "external_source") 
WHERE "external_id" IS NOT NULL AND "external_source" IS NOT NULL;

-- Add check constraint for source values
ALTER TABLE "calendarEvents" 
ADD CONSTRAINT "check_source_values" 
CHECK ("source" IN ('personal', 'work', 'flohub_local', 'powerautomate', 'google', 'office365'));

-- Add check constraint for sync status values
ALTER TABLE "calendarEvents" 
ADD CONSTRAINT "check_sync_status_values" 
CHECK ("sync_status" IN ('synced', 'pending', 'error', 'deleted'));

-- Update existing records to set proper defaults
UPDATE "calendarEvents" 
SET 
  "external_source" = CASE 
    WHEN "source" = 'personal' THEN 'flohub_local'
    WHEN "source" = 'work' THEN 'flohub_local'
    ELSE 'flohub_local'
  END,
  "sync_status" = 'synced',
  "last_updated" = "updated_at"
WHERE "external_source" IS NULL;

-- Add trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_updated
  BEFORE UPDATE ON "calendarEvents"
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();