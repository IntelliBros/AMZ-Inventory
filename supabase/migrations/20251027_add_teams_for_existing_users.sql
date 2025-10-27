-- Migration: Add teams for users who don't have one
-- This handles users created before automatic team creation was implemented

-- Insert teams for users who don't have any team_users record
INSERT INTO public.teams (name, owner_id)
SELECT
  SPLIT_PART(u.email, '@', 1) || '''s Team' AS name,
  u.id AS owner_id
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.team_users tu
  WHERE tu.user_id = u.id
);

-- Add those users to their new teams as owners
INSERT INTO public.team_users (team_id, user_id, role)
SELECT
  t.id AS team_id,
  t.owner_id AS user_id,
  'owner' AS role
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.team_users tu
  WHERE tu.user_id = t.owner_id
  AND tu.team_id = t.id
);

-- Log the results
DO $$
DECLARE
  users_without_teams INT;
  teams_created INT;
BEGIN
  -- Count users that had no teams before this migration
  SELECT COUNT(*) INTO users_without_teams
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.team_users tu WHERE tu.user_id = u.id
  );

  RAISE NOTICE 'Migration completed: % users had no teams', users_without_teams;
END $$;
