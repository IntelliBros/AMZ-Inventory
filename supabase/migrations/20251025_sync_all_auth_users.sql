-- Sync ALL users from auth.users to public.users
-- This handles the case where users exist in auth.users but not in public.users

INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
SELECT
  au.id,
  au.email,
  '' as password_hash, -- Empty password hash for migrated users
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Also update any existing records to ensure email matches
UPDATE public.users pu
SET email = au.email, updated_at = NOW()
FROM auth.users au
WHERE pu.id = au.id AND pu.email != au.email;
