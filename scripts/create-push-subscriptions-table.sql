-- Create pushSubscriptions table for FlowHub notifications
-- Run this SQL in your Neon database console

CREATE TABLE IF NOT EXISTS "pushSubscriptions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_email" varchar(255) NOT NULL,
    "subscription" jsonb NOT NULL
);

-- Add an index on user_email for better query performance
CREATE INDEX IF NOT EXISTS "idx_pushSubscriptions_user_email" ON "pushSubscriptions" ("user_email");

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pushSubscriptions'
ORDER BY ordinal_position;