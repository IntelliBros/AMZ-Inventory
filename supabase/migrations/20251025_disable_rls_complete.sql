-- Completely disable RLS on ALL tables
-- This is necessary because we use custom JWT auth, not Supabase Auth

-- Drop all policies first
DROP POLICY IF EXISTS "Allow anon access to users" ON public.users;
DROP POLICY IF EXISTS "Allow anon access to products" ON public.products;
DROP POLICY IF EXISTS "Allow anon access to suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow anon access to purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow anon access to shipping_invoices" ON public.shipping_invoices;
DROP POLICY IF EXISTS "Allow anon access to warehouse_snapshots" ON public.warehouse_snapshots;
DROP POLICY IF EXISTS "Allow anon access to sales_records" ON public.sales_records;
DROP POLICY IF EXISTS "Allow anon access to inventory_locations" ON public.inventory_locations;
DROP POLICY IF EXISTS "Allow anon access to po_line_items" ON public.po_line_items;
DROP POLICY IF EXISTS "Allow anon access to shipping_line_items" ON public.shipping_line_items;
DROP POLICY IF EXISTS "Allow anon access to shipment_pos" ON public.shipment_pos;

-- Disable RLS on ALL tables
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouse_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.po_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipment_pos DISABLE ROW LEVEL SECURITY;
