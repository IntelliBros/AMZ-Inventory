-- Safely sync users from auth.users to public.users
-- Only insert users that don't conflict with existing emails or IDs

INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
SELECT
  au.id,
  au.email,
  '' as password_hash,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id OR pu.email = au.email
);
