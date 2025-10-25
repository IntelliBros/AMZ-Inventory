-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create team_users junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.team_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Add team_id columns to all data tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.shipping_invoices ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.warehouse_snapshots ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.sales_records ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Migrate existing data: Create a default team for each user
INSERT INTO public.teams (id, name, owner_id)
SELECT
  gen_random_uuid(),
  COALESCE(team_name, SPLIT_PART(email, '@', 1) || '''s Team'),
  id
FROM public.users
ON CONFLICT DO NOTHING;

-- Link users to their default teams as owners
INSERT INTO public.team_users (team_id, user_id, role)
SELECT t.id, t.owner_id, 'owner'
FROM public.teams t
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Migrate existing data: Set team_id for all existing records
UPDATE public.products p
SET team_id = (
  SELECT t.id FROM public.teams t WHERE t.owner_id = p.user_id LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

UPDATE public.suppliers s
SET team_id = (
  SELECT t.id FROM public.teams t WHERE t.owner_id = s.user_id LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

UPDATE public.purchase_orders po
SET team_id = (
  SELECT t.id FROM public.teams t WHERE t.owner_id = po.user_id LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

UPDATE public.shipping_invoices si
SET team_id = (
  SELECT t.id FROM public.teams t WHERE t.owner_id = si.user_id LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

UPDATE public.warehouse_snapshots ws
SET team_id = (
  SELECT t.id FROM public.teams t WHERE t.owner_id = ws.user_id LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

UPDATE public.sales_records sr
SET team_id = (
  SELECT t.id FROM public.teams t WHERE t.owner_id = sr.user_id LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

-- Make team_id NOT NULL after migration (with defaults for safety)
ALTER TABLE public.products ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.purchase_orders ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.shipping_invoices ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.warehouse_snapshots ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.sales_records ALTER COLUMN team_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS teams_owner_id_idx ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS team_users_team_id_idx ON public.team_users(team_id);
CREATE INDEX IF NOT EXISTS team_users_user_id_idx ON public.team_users(user_id);
CREATE INDEX IF NOT EXISTS products_team_id_idx ON public.products(team_id);
CREATE INDEX IF NOT EXISTS suppliers_team_id_idx ON public.suppliers(team_id);
CREATE INDEX IF NOT EXISTS purchase_orders_team_id_idx ON public.purchase_orders(team_id);
CREATE INDEX IF NOT EXISTS shipping_invoices_team_id_idx ON public.shipping_invoices(team_id);
CREATE INDEX IF NOT EXISTS warehouse_snapshots_team_id_idx ON public.warehouse_snapshots(team_id);
CREATE INDEX IF NOT EXISTS sales_records_team_id_idx ON public.sales_records(team_id);

-- Grant permissions to anon role
GRANT ALL ON public.teams TO anon;
GRANT ALL ON public.team_users TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Add helpful comments
COMMENT ON TABLE public.teams IS 'Teams that can have multiple users and own data';
COMMENT ON TABLE public.team_users IS 'Junction table linking users to teams with roles';
COMMENT ON COLUMN public.teams.owner_id IS 'The user who created and owns this team';
COMMENT ON COLUMN public.team_users.role IS 'User role within the team (owner, admin, editor, viewer, member)';
