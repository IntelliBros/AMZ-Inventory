-- Automatically sync new users from auth.users to public.users
-- This ensures any user created through Supabase Auth also exists in public.users

-- First, manually insert any currently missing users
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

-- Create a function to sync users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Empty password hash for auth.users users
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
