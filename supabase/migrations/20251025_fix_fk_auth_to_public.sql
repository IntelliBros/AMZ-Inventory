-- Fix foreign key constraints that are still pointing to auth.users
-- They should point to public.users since we use custom JWT auth

-- Drop the constraint pointing to auth.users
ALTER TABLE public.suppliers
DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey;

-- Add new constraint pointing to public.users
ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Do the same for all other tables
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_user_id_fkey;

ALTER TABLE public.products
ADD CONSTRAINT products_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

ALTER TABLE public.purchase_orders
DROP CONSTRAINT IF EXISTS purchase_orders_user_id_fkey;

ALTER TABLE public.purchase_orders
ADD CONSTRAINT purchase_orders_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

ALTER TABLE public.shipping_invoices
DROP CONSTRAINT IF EXISTS shipping_invoices_user_id_fkey;

ALTER TABLE public.shipping_invoices
ADD CONSTRAINT shipping_invoices_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

ALTER TABLE public.warehouse_snapshots
DROP CONSTRAINT IF EXISTS warehouse_snapshots_user_id_fkey;

ALTER TABLE public.warehouse_snapshots
ADD CONSTRAINT warehouse_snapshots_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

ALTER TABLE public.sales_records
DROP CONSTRAINT IF EXISTS sales_records_user_id_fkey;

ALTER TABLE public.sales_records
ADD CONSTRAINT sales_records_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;
