-- Sync existing users from auth.users to public.users
-- This is needed for users who were created before the JWT auth migration

-- Insert users from auth.users into public.users if they don't already exist
INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
SELECT
  id,
  email,
  '' as password_hash, -- Empty password hash since we're migrating from Supabase Auth
  created_at,
  NOW() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Also insert based on email to catch any discrepancies
INSERT INTO public.users (email, password_hash, created_at, updated_at)
SELECT
  email,
  '' as password_hash,
  created_at,
  NOW() as updated_at
FROM auth.users
WHERE email NOT IN (SELECT email FROM public.users)
ON CONFLICT (email) DO NOTHING;
