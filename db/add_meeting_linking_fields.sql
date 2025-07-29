-- Migration: Add meeting linking fields to notes table
-- Add meeting_series column for manual series grouping
ALTER TABLE notes 
ADD COLUMN meeting_series VARCHAR(255);

-- Add linked_meeting_ids column for manual meeting linking
ALTER TABLE notes 
ADD COLUMN linked_meeting_ids TEXT[];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_meeting_series ON notes(meeting_series) WHERE meeting_series IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_linked_meeting_ids ON notes USING GIN(linked_meeting_ids) WHERE linked_meeting_ids IS NOT NULL;