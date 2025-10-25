-- Fix foreign key constraints to reference public.users instead of auth.users
-- This is needed because we're using JWT auth with a custom users table

-- Drop existing foreign key constraints
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_user_id_fkey;
ALTER TABLE shipping_invoices DROP CONSTRAINT IF EXISTS shipping_invoices_user_id_fkey;
ALTER TABLE warehouse_snapshots DROP CONSTRAINT IF EXISTS warehouse_snapshots_user_id_fkey;
ALTER TABLE sales_records DROP CONSTRAINT IF EXISTS sales_records_user_id_fkey;

-- Add new foreign key constraints pointing to public.users
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE products
  ADD CONSTRAINT products_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE shipping_invoices
  ADD CONSTRAINT shipping_invoices_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE warehouse_snapshots
  ADD CONSTRAINT warehouse_snapshots_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE sales_records
  ADD CONSTRAINT sales_records_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
