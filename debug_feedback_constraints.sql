-- Query to check all constraints on the feedback table
SELECT 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'feedback'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Check the exact column definitions
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;

-- Check if there are any triggers on the table
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'feedback';

-- Try a simple test insertion to see what happens
-- INSERT INTO feedback (user_email, title, description, status) 
-- VALUES ('test@example.com', 'Test Title', 'Test Description', 'open');