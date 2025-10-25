-- Debug query to check user and foreign key constraint

-- 1. Check if user exists in public.users
SELECT 'User exists check:' as query, id, email, created_at
FROM public.users
WHERE id = 'c0161cf4-e698-4e29-a0a2-2cd15bf9ad07';

-- 2. Check all users in public.users
SELECT 'All users in public.users:' as query, id, email, created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Check the foreign key constraint definition
SELECT
    'Foreign key constraint:' as query,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'suppliers'
  AND kcu.column_name = 'user_id';

-- 4. Check RLS status on users table
SELECT
    'RLS status:' as query,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';
