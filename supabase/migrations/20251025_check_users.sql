-- Check users in both tables
SELECT 'auth.users' as source, id, email, created_at FROM auth.users WHERE email = 'daniel.vadacchino@hotmail.com'
UNION ALL
SELECT 'public.users' as source, id, email, created_at FROM public.users WHERE email = 'daniel.vadacchino@hotmail.com';
