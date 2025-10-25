-- Create team_members table for staff access (without RLS)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(owner_id, member_id)
);

CREATE INDEX IF NOT EXISTS team_members_owner_id_idx ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS team_members_member_id_idx ON public.team_members(member_id);

COMMENT ON TABLE public.team_members IS 'Team members who can access owner data';
COMMENT ON COLUMN public.team_members.owner_id IS 'The account owner whose data the member can access';
COMMENT ON COLUMN public.team_members.member_id IS 'The team member who gets access';
COMMENT ON COLUMN public.team_members.role IS 'Access level: admin (full access), editor (read/write), viewer (read only)';
