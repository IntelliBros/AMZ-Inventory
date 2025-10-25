-- Add team_name column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Set default team name for existing users based on their email
UPDATE public.users
SET team_name = COALESCE(team_name, SPLIT_PART(email, '@', 1) || '''s Team')
WHERE team_name IS NULL OR team_name = '';

COMMENT ON COLUMN public.users.team_name IS 'Custom team name displayed in the sidebar';
