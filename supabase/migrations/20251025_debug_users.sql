-- Debug: Check if user c0161cf4-e698-4e29-a0a2-2cd15bf9ad07 exists
-- This migration helps diagnose the foreign key issue

-- First, let's see all users in public.users
DO $$
BEGIN
  RAISE NOTICE 'All users in public.users:';
  RAISE NOTICE '%', (SELECT array_agg(row(id, email)::text) FROM public.users);
END $$;

-- Check if the specific user exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE id = 'c0161cf4-e698-4e29-a0a2-2cd15bf9ad07') THEN
    RAISE NOTICE 'User c0161cf4-e698-4e29-a0a2-2cd15bf9ad07 EXISTS in public.users';
  ELSE
    RAISE NOTICE 'User c0161cf4-e698-4e29-a0a2-2cd15bf9ad07 DOES NOT EXIST in public.users';
  END IF;
END $$;

-- Ensure the user from signup exists
INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
SELECT
  'c0161cf4-e698-4e29-a0a2-2cd15bf9ad07'::uuid,
  'daniel.vadacchino+5@hotmail.com',
  '$2a$10$placeholder', -- Placeholder, actual hash should already exist
  NOW(),
  NOW()
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
