-- Disable RLS completely since we're using custom JWT auth (not Supabase Auth)
-- Security is handled at application level with user_id filtering

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow anon access to users" ON public.users;
DROP POLICY IF EXISTS "Allow anon access to products" ON public.products;
DROP POLICY IF EXISTS "Allow anon access to suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow anon access to purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow anon access to shipping_invoices" ON public.shipping_invoices;
DROP POLICY IF EXISTS "Allow anon access to warehouse_snapshots" ON public.warehouse_snapshots;
DROP POLICY IF EXISTS "Allow anon access to sales_records" ON public.sales_records;

-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
