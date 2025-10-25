-- Multi-tenant setup with user isolation and staff access
-- Run this in Supabase SQL Editor

-- 1. Create team_members table for staff access
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

-- 2. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert own data" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update own data" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete own data" ON public.suppliers;

-- 4. Create RLS policies for users table
CREATE POLICY "Service role bypasses RLS" ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Create RLS policies for suppliers
CREATE POLICY "Users can view own suppliers or team suppliers" ON public.suppliers
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members WHERE member_id = user_id
    )
  );

CREATE POLICY "Users can insert own suppliers" ON public.suppliers
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update own suppliers or team suppliers (if admin/editor)" ON public.suppliers
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own suppliers or team suppliers (if admin)" ON public.suppliers
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role = 'admin'
    )
  );

-- 6. Create RLS policies for products (same pattern as suppliers)
CREATE POLICY "Users can view own products or team products" ON public.products
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members WHERE member_id = user_id
    )
  );

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update own products or team products (if admin/editor)" ON public.products
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own products or team products (if admin)" ON public.products
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role = 'admin'
    )
  );

-- 7. Create RLS policies for purchase_orders
CREATE POLICY "Users can view own POs or team POs" ON public.purchase_orders
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members WHERE member_id = user_id
    )
  );

CREATE POLICY "Users can insert own POs" ON public.purchase_orders
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update own POs or team POs (if admin/editor)" ON public.purchase_orders
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own POs or team POs (if admin)" ON public.purchase_orders
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role = 'admin'
    )
  );

-- 8. Create RLS policies for shipping_invoices
CREATE POLICY "Users can view own invoices or team invoices" ON public.shipping_invoices
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members WHERE member_id = user_id
    )
  );

CREATE POLICY "Users can insert own invoices" ON public.shipping_invoices
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update own invoices or team invoices (if admin/editor)" ON public.shipping_invoices
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own invoices or team invoices (if admin)" ON public.shipping_invoices
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role = 'admin'
    )
  );

-- 9. Create RLS policies for warehouse_snapshots
CREATE POLICY "Users can view own snapshots or team snapshots" ON public.warehouse_snapshots
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members WHERE member_id = user_id
    )
  );

CREATE POLICY "Users can insert own snapshots" ON public.warehouse_snapshots
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update own snapshots or team snapshots (if admin/editor)" ON public.warehouse_snapshots
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can delete own snapshots or team snapshots (if admin)" ON public.warehouse_snapshots
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members 
      WHERE member_id = user_id AND role = 'admin'
    )
  );

-- 10. Create RLS policies for inventory_history
CREATE POLICY "Users can view own history or team history" ON public.inventory_history
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE id = user_id
      UNION
      SELECT owner_id FROM public.team_members WHERE member_id = user_id
    )
  );

CREATE POLICY "Users can insert own history" ON public.inventory_history
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

-- 11. Create RLS policies for team_members
CREATE POLICY "Users can view their own team memberships" ON public.team_members
  FOR SELECT
  USING (owner_id = member_id OR member_id = member_id);

CREATE POLICY "Account owners can manage their team" ON public.team_members
  FOR ALL
  USING (owner_id IN (SELECT id FROM public.users WHERE id = owner_id));

-- 12. Create RLS policies for child tables (they inherit permissions from parent tables)
-- inventory_locations: accessible if user has access to the product
CREATE POLICY "Users can view inventory locations for accessible products" ON public.inventory_locations
  FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members WHERE member_id = user_id
      )
    )
  );

CREATE POLICY "Users can manage inventory locations for their products" ON public.inventory_locations
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members 
        WHERE member_id = user_id AND role IN ('admin', 'editor')
      )
    )
  );

-- po_line_items: accessible if user has access to the PO
CREATE POLICY "Users can view PO line items for accessible POs" ON public.po_line_items
  FOR SELECT
  USING (
    po_id IN (
      SELECT id FROM public.purchase_orders 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members WHERE member_id = user_id
      )
    )
  );

CREATE POLICY "Users can manage PO line items for their POs" ON public.po_line_items
  FOR ALL
  USING (
    po_id IN (
      SELECT id FROM public.purchase_orders 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members 
        WHERE member_id = user_id AND role IN ('admin', 'editor')
      )
    )
  );

-- shipping_line_items: accessible if user has access to the shipping invoice
CREATE POLICY "Users can view shipping line items for accessible invoices" ON public.shipping_line_items
  FOR SELECT
  USING (
    shipping_invoice_id IN (
      SELECT id FROM public.shipping_invoices 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members WHERE member_id = user_id
      )
    )
  );

CREATE POLICY "Users can manage shipping line items for their invoices" ON public.shipping_line_items
  FOR ALL
  USING (
    shipping_invoice_id IN (
      SELECT id FROM public.shipping_invoices 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members 
        WHERE member_id = user_id AND role IN ('admin', 'editor')
      )
    )
  );

-- shipment_pos: accessible if user has access to the shipping invoice
CREATE POLICY "Users can view shipment POs for accessible invoices" ON public.shipment_pos
  FOR SELECT
  USING (
    shipping_invoice_id IN (
      SELECT id FROM public.shipping_invoices 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members WHERE member_id = user_id
      )
    )
  );

CREATE POLICY "Users can manage shipment POs for their invoices" ON public.shipment_pos
  FOR ALL
  USING (
    shipping_invoice_id IN (
      SELECT id FROM public.shipping_invoices 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE id = user_id
        UNION
        SELECT owner_id FROM public.team_members 
        WHERE member_id = user_id AND role IN ('admin', 'editor')
      )
    )
  );
