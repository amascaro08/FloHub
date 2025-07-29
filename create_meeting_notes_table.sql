-- Create meeting_notes table for better organization and linking capabilities
-- This table will replace the meeting notes functionality currently in the notes table

CREATE TABLE IF NOT EXISTS "meeting_notes" (
    "id" SERIAL PRIMARY KEY,
    "user_email" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),
    "event_id" VARCHAR(255),
    "event_title" VARCHAR(255),
    "is_adhoc" BOOLEAN DEFAULT FALSE,
    "actions" JSONB,
    "agenda" TEXT,
    "ai_summary" TEXT,
    "meeting_series_id" VARCHAR(255), -- For linking related meetings
    "parent_meeting_id" INTEGER REFERENCES meeting_notes(id), -- For follow-up meetings
    "meeting_date" TIMESTAMP,
    "attendees" JSONB, -- Store attendee information
    "meeting_type" VARCHAR(50) DEFAULT 'regular', -- regular, standup, review, planning, etc.
    "status" VARCHAR(50) DEFAULT 'completed', -- scheduled, completed, cancelled
    "source" VARCHAR(50) DEFAULT 'manual' -- manual, calendar, import
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_email ON meeting_notes(user_email);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_created_at ON meeting_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_series_id ON meeting_notes(meeting_series_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_parent_meeting_id ON meeting_notes(parent_meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_date ON meeting_notes(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_event_id ON meeting_notes(event_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_meeting_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_notes_updated_at
    BEFORE UPDATE ON meeting_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_notes_updated_at();

-- Optional: Migrate existing meeting notes from notes table
-- INSERT INTO meeting_notes (
--     user_email, title, content, tags, created_at, event_id, event_title, 
--     is_adhoc, actions, agenda, ai_summary
-- )
-- SELECT 
--     user_email, title, content, tags, created_at, event_id, event_title,
--     is_adhoc, actions, agenda, ai_summary
-- FROM notes 
-- WHERE event_id IS NOT NULL OR is_adhoc = TRUE;

-- Optional: Clean up meeting notes from the notes table after migration
-- DELETE FROM notes WHERE event_id IS NOT NULL OR is_adhoc = TRUE;