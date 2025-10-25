-- Drop all existing policies first
DROP POLICY IF EXISTS "Service role bypasses RLS" ON public.users;
DROP POLICY IF EXISTS "Users can view own suppliers or team suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update own suppliers or team suppliers (if admin/editor)" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete own suppliers or team suppliers (if admin)" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view own products or team products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products or team products (if admin/editor)" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products or team products (if admin)" ON public.products;
DROP POLICY IF EXISTS "Users can view own POs or team POs" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert own POs" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update own POs or team POs (if admin/editor)" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can delete own POs or team POs (if admin)" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can view own invoices or team invoices" ON public.shipping_invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.shipping_invoices;
DROP POLICY IF EXISTS "Users can update own invoices or team invoices (if admin/editor)" ON public.shipping_invoices;
DROP POLICY IF EXISTS "Users can delete own invoices or team invoices (if admin)" ON public.shipping_invoices;
DROP POLICY IF EXISTS "Users can view own snapshots or team snapshots" ON public.warehouse_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.warehouse_snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots or team snapshots (if admin/editor)" ON public.warehouse_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots or team snapshots (if admin)" ON public.warehouse_snapshots;
DROP POLICY IF EXISTS "Users can view own sales or team sales" ON public.sales_records;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales_records;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Account owners can manage their team" ON public.team_members;
DROP POLICY IF EXISTS "Users can view inventory locations for accessible products" ON public.inventory_locations;
DROP POLICY IF EXISTS "Users can manage inventory locations for their products" ON public.inventory_locations;
DROP POLICY IF EXISTS "Users can view PO line items for accessible POs" ON public.po_line_items;
DROP POLICY IF EXISTS "Users can manage PO line items for their POs" ON public.po_line_items;
DROP POLICY IF EXISTS "Users can view shipping line items for accessible invoices" ON public.shipping_line_items;
DROP POLICY IF EXISTS "Users can manage shipping line items for their invoices" ON public.shipping_line_items;
DROP POLICY IF EXISTS "Users can view shipment POs for accessible invoices" ON public.shipment_pos;
DROP POLICY IF EXISTS "Users can manage shipment POs for their invoices" ON public.shipment_pos;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow anon key to access all data
-- Security is handled at application level via user_id filtering

-- Users table
CREATE POLICY "Allow anon access to users" ON public.users FOR ALL USING (true);

-- Products table
CREATE POLICY "Allow anon access to products" ON public.products FOR ALL USING (true);

-- Suppliers table
CREATE POLICY "Allow anon access to suppliers" ON public.suppliers FOR ALL USING (true);

-- Inventory locations table
CREATE POLICY "Allow anon access to inventory_locations" ON public.inventory_locations FOR ALL USING (true);

-- Purchase orders table
CREATE POLICY "Allow anon access to purchase_orders" ON public.purchase_orders FOR ALL USING (true);

-- PO line items table
CREATE POLICY "Allow anon access to po_line_items" ON public.po_line_items FOR ALL USING (true);

-- Shipping invoices table
CREATE POLICY "Allow anon access to shipping_invoices" ON public.shipping_invoices FOR ALL USING (true);

-- Shipment POs table
CREATE POLICY "Allow anon access to shipment_pos" ON public.shipment_pos FOR ALL USING (true);

-- Shipping line items table
CREATE POLICY "Allow anon access to shipping_line_items" ON public.shipping_line_items FOR ALL USING (true);

-- Warehouse snapshots table
CREATE POLICY "Allow anon access to warehouse_snapshots" ON public.warehouse_snapshots FOR ALL USING (true);

-- Sales records table
CREATE POLICY "Allow anon access to sales_records" ON public.sales_records FOR ALL USING (true);

-- Team members table
CREATE POLICY "Allow anon access to team_members" ON public.team_members FOR ALL USING (true);
