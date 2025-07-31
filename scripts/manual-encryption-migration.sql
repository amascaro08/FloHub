-- ====================================================================
-- Manual Encryption Migration SQL Commands for Neon Database
-- ====================================================================
-- 
-- IMPORTANT: These commands help you identify unencrypted user data
-- that needs to be encrypted. Run these in your Neon database console.
-- 
-- WARNING: Backup your database before running any UPDATE commands!
-- ====================================================================

-- ====================================================================
-- 1. CREATE BACKUP TABLES
-- ====================================================================

-- Create backup tables with current date suffix
-- Replace YYYY_MM_DD with current date (e.g., 2024_12_19)
CREATE TABLE IF NOT EXISTS notes_backup_YYYY_MM_DD AS SELECT * FROM notes;
CREATE TABLE IF NOT EXISTS journal_entries_backup_YYYY_MM_DD AS SELECT * FROM journal_entries;
CREATE TABLE IF NOT EXISTS "habitCompletions_backup_YYYY_MM_DD" AS SELECT * FROM "habitCompletions";
CREATE TABLE IF NOT EXISTS "calendarEvents_backup_YYYY_MM_DD" AS SELECT * FROM "calendarEvents";
CREATE TABLE IF NOT EXISTS feedback_backup_YYYY_MM_DD AS SELECT * FROM feedback;
CREATE TABLE IF NOT EXISTS user_settings_backup_YYYY_MM_DD AS SELECT * FROM user_settings;
CREATE TABLE IF NOT EXISTS conversations_backup_YYYY_MM_DD AS SELECT * FROM conversations;
CREATE TABLE IF NOT EXISTS habits_backup_YYYY_MM_DD AS SELECT * FROM habits;
CREATE TABLE IF NOT EXISTS tasks_backup_YYYY_MM_DD AS SELECT * FROM tasks;
CREATE TABLE IF NOT EXISTS journal_moods_backup_YYYY_MM_DD AS SELECT * FROM journal_moods;
CREATE TABLE IF NOT EXISTS journal_activities_backup_YYYY_MM_DD AS SELECT * FROM journal_activities;
CREATE TABLE IF NOT EXISTS meetings_backup_YYYY_MM_DD AS SELECT * FROM meetings;
CREATE TABLE IF NOT EXISTS analytics_backup_YYYY_MM_DD AS SELECT * FROM analytics;

-- ====================================================================
-- 2. IDENTIFY UNENCRYPTED DATA
-- ====================================================================

-- Count unencrypted notes content
SELECT 'notes_content' as table_field, COUNT(*) as unencrypted_count
FROM notes 
WHERE content IS NOT NULL 
  AND content != '' 
  AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%');

-- Count unencrypted notes titles
SELECT 'notes_title' as table_field, COUNT(*) as unencrypted_count
FROM notes 
WHERE title IS NOT NULL 
  AND title != '' 
  AND (title::text NOT LIKE '%"isEncrypted":true%' OR title::text NOT LIKE '{"data":%');

-- Count unencrypted calendar events
SELECT 'calendar_events_summary' as table_field, COUNT(*) as unencrypted_count
FROM "calendarEvents" 
WHERE summary IS NOT NULL 
  AND summary != '' 
  AND (summary::text NOT LIKE '%"isEncrypted":true%' OR summary::text NOT LIKE '{"data":%');

-- Count unencrypted calendar event descriptions
SELECT 'calendar_events_description' as table_field, COUNT(*) as unencrypted_count
FROM "calendarEvents" 
WHERE description IS NOT NULL 
  AND description != '' 
  AND (description::text NOT LIKE '%"isEncrypted":true%' OR description::text NOT LIKE '{"data":%');

-- Count unencrypted calendar event locations
SELECT 'calendar_events_location' as table_field, COUNT(*) as unencrypted_count
FROM "calendarEvents" 
WHERE location IS NOT NULL 
  AND location != '' 
  AND (location::text NOT LIKE '%"isEncrypted":true%' OR location::text NOT LIKE '{"data":%');

-- Count unencrypted calendar event tags (arrays)
SELECT 'calendar_events_tags' as table_field, COUNT(*) as unencrypted_count
FROM "calendarEvents" 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0;

-- Count unencrypted feedback titles
SELECT 'feedback_title' as table_field, COUNT(*) as unencrypted_count
FROM feedback 
WHERE title IS NOT NULL 
  AND title != '' 
  AND (title::text NOT LIKE '%"isEncrypted":true%' OR title::text NOT LIKE '{"data":%');

-- Count unencrypted feedback descriptions
SELECT 'feedback_description' as table_field, COUNT(*) as unencrypted_count
FROM feedback 
WHERE description IS NOT NULL 
  AND description != '' 
  AND (description::text NOT LIKE '%"isEncrypted":true%' OR description::text NOT LIKE '{"data":%');

-- Count unencrypted user settings preferred names
SELECT 'user_settings_preferred_name' as table_field, COUNT(*) as unencrypted_count
FROM user_settings 
WHERE preferred_name IS NOT NULL 
  AND preferred_name != '' 
  AND (preferred_name::text NOT LIKE '%"isEncrypted":true%' OR preferred_name::text NOT LIKE '{"data":%');

-- Count unencrypted user settings global tags
SELECT 'user_settings_global_tags' as table_field, COUNT(*) as unencrypted_count
FROM user_settings 
WHERE global_tags IS NOT NULL 
  AND array_length(global_tags, 1) > 0;

-- Count unencrypted user settings tags
SELECT 'user_settings_tags' as table_field, COUNT(*) as unencrypted_count
FROM user_settings 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0;

-- Count unencrypted tasks text
SELECT 'tasks_text' as table_field, COUNT(*) as unencrypted_count
FROM tasks 
WHERE text IS NOT NULL 
  AND text != '' 
  AND (text::text NOT LIKE '%"isEncrypted":true%' OR text::text NOT LIKE '{"data":%');

-- Count unencrypted task tags
SELECT 'tasks_tags' as table_field, COUNT(*) as unencrypted_count
FROM tasks 
WHERE tags IS NOT NULL;

-- Count unencrypted habits names
SELECT 'habits_name' as table_field, COUNT(*) as unencrypted_count
FROM habits 
WHERE name IS NOT NULL 
  AND name != '' 
  AND (name::text NOT LIKE '%"isEncrypted":true%' OR name::text NOT LIKE '{"data":%');

-- Count unencrypted habits descriptions
SELECT 'habits_description' as table_field, COUNT(*) as unencrypted_count
FROM habits 
WHERE description IS NOT NULL 
  AND description != '' 
  AND (description::text NOT LIKE '%"isEncrypted":true%' OR description::text NOT LIKE '{"data":%');

-- Count unencrypted habit completion notes
SELECT 'habit_completions_notes' as table_field, COUNT(*) as unencrypted_count
FROM "habitCompletions" 
WHERE notes IS NOT NULL 
  AND notes != '' 
  AND (notes::text NOT LIKE '%"isEncrypted":true%' OR notes::text NOT LIKE '{"data":%');

-- Count unencrypted journal entries
SELECT 'journal_entries_content' as table_field, COUNT(*) as unencrypted_count
FROM journal_entries 
WHERE content IS NOT NULL 
  AND content != '' 
  AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%');

-- Count unencrypted journal mood tags
SELECT 'journal_moods_tags' as table_field, COUNT(*) as unencrypted_count
FROM journal_moods 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0;

-- Count unencrypted journal activities
SELECT 'journal_activities_activities' as table_field, COUNT(*) as unencrypted_count
FROM journal_activities 
WHERE activities IS NOT NULL 
  AND array_length(activities, 1) > 0;

-- Count unencrypted conversations
SELECT 'conversations_messages' as table_field, COUNT(*) as unencrypted_count
FROM conversations 
WHERE messages IS NOT NULL;

-- Count unencrypted meetings titles
SELECT 'meetings_title' as table_field, COUNT(*) as unencrypted_count
FROM meetings 
WHERE title IS NOT NULL 
  AND title != '' 
  AND (title::text NOT LIKE '%"isEncrypted":true%' OR title::text NOT LIKE '{"data":%');

-- Count unencrypted meetings content
SELECT 'meetings_content' as table_field, COUNT(*) as unencrypted_count
FROM meetings 
WHERE content IS NOT NULL 
  AND content != '' 
  AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%');

-- Count unencrypted analytics event data
SELECT 'analytics_event_data' as table_field, COUNT(*) as unencrypted_count
FROM analytics 
WHERE event_data IS NOT NULL;

-- ====================================================================
-- 3. GET SAMPLE DATA FOR VERIFICATION
-- ====================================================================

-- Sample unencrypted notes (first 5)
SELECT id, user_email, left(content, 50) as content_preview, left(title, 30) as title_preview
FROM notes 
WHERE content IS NOT NULL 
  AND content != '' 
  AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%')
LIMIT 5;

-- Sample unencrypted calendar events (first 5)
SELECT id, user_email, left(summary, 30) as summary_preview, left(description, 30) as description_preview
FROM "calendarEvents" 
WHERE summary IS NOT NULL 
  AND summary != '' 
  AND (summary::text NOT LIKE '%"isEncrypted":true%' OR summary::text NOT LIKE '{"data":%')
LIMIT 5;

-- Sample unencrypted tasks (first 5)
SELECT id, user_email, left(text, 50) as text_preview
FROM tasks 
WHERE text IS NOT NULL 
  AND text != '' 
  AND (text::text NOT LIKE '%"isEncrypted":true%' OR text::text NOT LIKE '{"data":%')
LIMIT 5;

-- ====================================================================
-- 4. IDENTIFY USERS WITH UNENCRYPTED DATA
-- ====================================================================

-- Users with unencrypted content across all tables
WITH unencrypted_users AS (
  SELECT user_email FROM notes WHERE content IS NOT NULL AND content != '' AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%')
  UNION
  SELECT user_email FROM "calendarEvents" WHERE summary IS NOT NULL AND summary != '' AND (summary::text NOT LIKE '%"isEncrypted":true%' OR summary::text NOT LIKE '{"data":%')
  UNION
  SELECT user_email FROM feedback WHERE title IS NOT NULL AND title != '' AND (title::text NOT LIKE '%"isEncrypted":true%' OR title::text NOT LIKE '{"data":%')
  UNION
  SELECT user_email FROM user_settings WHERE preferred_name IS NOT NULL AND preferred_name != '' AND (preferred_name::text NOT LIKE '%"isEncrypted":true%' OR preferred_name::text NOT LIKE '{"data":%')
  UNION
  SELECT user_email FROM tasks WHERE text IS NOT NULL AND text != '' AND (text::text NOT LIKE '%"isEncrypted":true%' OR text::text NOT LIKE '{"data":%')
  UNION
  SELECT user_email FROM journal_entries WHERE content IS NOT NULL AND content != '' AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%')
)
SELECT user_email, 'has_unencrypted_data' as status
FROM unencrypted_users
ORDER BY user_email;

-- ====================================================================
-- 5. DISK SPACE ESTIMATION
-- ====================================================================

-- Estimate current data size and expected growth after encryption
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('notes', 'calendarEvents', 'feedback', 'user_settings', 'tasks', 'habits', 'habitCompletions', 'journal_entries', 'journal_moods', 'journal_activities', 'conversations', 'meetings', 'analytics')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ====================================================================
-- 6. RECOMMEND NEXT STEPS
-- ====================================================================

-- This query shows a summary of what needs to be encrypted
SELECT 
  'SUMMARY' as action_needed,
  'Run the Node.js migration script: npm run tsx scripts/migrate-content-encryption.ts' as recommendation;

-- ====================================================================
-- 7. MANUAL ENCRYPTION EXAMPLES (FOR SMALL DATASETS ONLY)
-- ====================================================================

-- WARNING: These are examples only. For production, use the Node.js migration script.
-- These examples show the structure but won't actually encrypt the data properly.

/*
-- Example: Manually mark content as "needs encryption" (DO NOT USE IN PRODUCTION)
UPDATE notes 
SET content = '{"data":"' || content || '","iv":"","isEncrypted":false,"needsEncryption":true}'
WHERE content IS NOT NULL 
  AND content != '' 
  AND content::text NOT LIKE '%"isEncrypted":%'
  AND id IN (SELECT id FROM notes LIMIT 1); -- REMOVE LIMIT FOR ALL RECORDS

-- Example: Identify specific user data that needs encryption
SELECT 
  'notes' as table_name,
  id as record_id,
  user_email,
  'content' as field_name,
  length(content) as field_length
FROM notes 
WHERE user_email = 'user@example.com' -- Replace with specific user email
  AND content IS NOT NULL 
  AND content != '' 
  AND (content::text NOT LIKE '%"isEncrypted":true%' OR content::text NOT LIKE '{"data":%');
*/

-- ====================================================================
-- 8. VERIFICATION QUERIES (Run after encryption)
-- ====================================================================

-- Verify encryption was successful - these should return 0 or very few results
SELECT 'Remaining unencrypted notes' as check_type, COUNT(*) as count
FROM notes 
WHERE content IS NOT NULL 
  AND content != '' 
  AND content::text NOT LIKE '%"isEncrypted":true%'
  AND content::text NOT LIKE '{"data":%';

SELECT 'Remaining unencrypted calendar events' as check_type, COUNT(*) as count
FROM "calendarEvents" 
WHERE summary IS NOT NULL 
  AND summary != '' 
  AND summary::text NOT LIKE '%"isEncrypted":true%'
  AND summary::text NOT LIKE '{"data":%';

SELECT 'Remaining unencrypted tasks' as check_type, COUNT(*) as count
FROM tasks 
WHERE text IS NOT NULL 
  AND text != '' 
  AND text::text NOT LIKE '%"isEncrypted":true%'
  AND text::text NOT LIKE '{"data":%';

-- ====================================================================
-- 9. ROLLBACK COMMANDS (IF NEEDED)
-- ====================================================================

/*
-- EMERGENCY ROLLBACK: Restore from backup tables
-- WARNING: This will lose any data created after the backup!

DROP TABLE IF EXISTS notes;
ALTER TABLE notes_backup_YYYY_MM_DD RENAME TO notes;

DROP TABLE IF EXISTS "calendarEvents";
ALTER TABLE "calendarEvents_backup_YYYY_MM_DD" RENAME TO "calendarEvents";

DROP TABLE IF EXISTS feedback;
ALTER TABLE feedback_backup_YYYY_MM_DD RENAME TO feedback;

DROP TABLE IF EXISTS user_settings;
ALTER TABLE user_settings_backup_YYYY_MM_DD RENAME TO user_settings;

DROP TABLE IF EXISTS tasks;
ALTER TABLE tasks_backup_YYYY_MM_DD RENAME TO tasks;

DROP TABLE IF EXISTS habits;
ALTER TABLE habits_backup_YYYY_MM_DD RENAME TO habits;

DROP TABLE IF EXISTS "habitCompletions";
ALTER TABLE "habitCompletions_backup_YYYY_MM_DD" RENAME TO "habitCompletions";

DROP TABLE IF EXISTS journal_entries;
ALTER TABLE journal_entries_backup_YYYY_MM_DD RENAME TO journal_entries;

DROP TABLE IF EXISTS journal_moods;
ALTER TABLE journal_moods_backup_YYYY_MM_DD RENAME TO journal_moods;

DROP TABLE IF EXISTS journal_activities;
ALTER TABLE journal_activities_backup_YYYY_MM_DD RENAME TO journal_activities;

DROP TABLE IF EXISTS conversations;
ALTER TABLE conversations_backup_YYYY_MM_DD RENAME TO conversations;

DROP TABLE IF EXISTS meetings;
ALTER TABLE meetings_backup_YYYY_MM_DD RENAME TO meetings;

DROP TABLE IF EXISTS analytics;
ALTER TABLE analytics_backup_YYYY_MM_DD RENAME TO analytics;
*/

-- ====================================================================
-- 10. CLEANUP BACKUP TABLES (After successful encryption and verification)
-- ====================================================================

/*
-- Remove backup tables after successful migration and verification
-- Only run this after confirming everything works correctly!

DROP TABLE IF EXISTS notes_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS journal_entries_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS "habitCompletions_backup_YYYY_MM_DD";
DROP TABLE IF EXISTS "calendarEvents_backup_YYYY_MM_DD";
DROP TABLE IF EXISTS feedback_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS user_settings_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS conversations_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS habits_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS tasks_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS journal_moods_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS journal_activities_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS meetings_backup_YYYY_MM_DD;
DROP TABLE IF EXISTS analytics_backup_YYYY_MM_DD;
*/

-- ====================================================================
-- FINAL NOTES
-- ====================================================================

/*
RECOMMENDED APPROACH:
1. Run the identification queries above to see what needs encryption
2. Create backups using the backup table commands
3. Use the Node.js migration script: npm run tsx scripts/migrate-content-encryption.ts --dry-run
4. If dry run looks good, run: npm run tsx scripts/migrate-content-encryption.ts
5. Verify encryption with the verification queries
6. Clean up backup tables after confirming everything works

IMPORTANT SECURITY NOTES:
- Ensure CONTENT_ENCRYPTION_KEY environment variable is set with a strong key
- Never commit the encryption key to version control
- Store the encryption key securely - losing it makes data unrecoverable
- Test the encryption/decryption process thoroughly before production deployment
- Monitor application logs for encryption/decryption errors
*/