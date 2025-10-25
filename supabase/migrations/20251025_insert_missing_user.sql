-- Insert the missing user into public.users using the auth.users ID
-- This ensures the foreign key constraints work

INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
VALUES (
  '2f173e0b-c509-4491-8bc6-c52591f1d04c'::uuid,
  'daniel.vadacchino@hotmail.com',
  '', -- Empty password hash, user will need to reset if using JWT auth
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();
