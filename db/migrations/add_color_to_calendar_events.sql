-- Migration to add color field to calendar events
-- This allows users to customize event colors for better visual organization

ALTER TABLE "calendarEvents" ADD COLUMN "color" varchar(7);

-- Add comment to document the column purpose
COMMENT ON COLUMN "calendarEvents"."color" IS 'Hex color code for event customization (e.g., #ff0000)';