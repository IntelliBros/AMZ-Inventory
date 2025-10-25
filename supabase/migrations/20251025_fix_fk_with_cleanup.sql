-- Fix foreign key constraints with data cleanup
-- Step 1: Remove the old constraint
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_user_id_fkey;
ALTER TABLE public.shipping_invoices DROP CONSTRAINT IF EXISTS shipping_invoices_user_id_fkey;
ALTER TABLE public.warehouse_snapshots DROP CONSTRAINT IF EXISTS warehouse_snapshots_user_id_fkey;
ALTER TABLE public.sales_records DROP CONSTRAINT IF EXISTS sales_records_user_id_fkey;

-- Step 2: Get the first valid user from public.users to reassign orphaned records
DO $$
DECLARE
  valid_user_id uuid;
BEGIN
  -- Get any valid user from public.users
  SELECT id INTO valid_user_id FROM public.users LIMIT 1;

  IF valid_user_id IS NOT NULL THEN
    -- Update orphaned suppliers
    UPDATE public.suppliers
    SET user_id = valid_user_id
    WHERE user_id NOT IN (SELECT id FROM public.users);

    -- Update orphaned products
    UPDATE public.products
    SET user_id = valid_user_id
    WHERE user_id NOT IN (SELECT id FROM public.users);

    -- Update orphaned purchase_orders
    UPDATE public.purchase_orders
    SET user_id = valid_user_id
    WHERE user_id NOT IN (SELECT id FROM public.users);

    -- Update orphaned shipping_invoices
    UPDATE public.shipping_invoices
    SET user_id = valid_user_id
    WHERE user_id NOT IN (SELECT id FROM public.users);

    -- Update orphaned warehouse_snapshots
    UPDATE public.warehouse_snapshots
    SET user_id = valid_user_id
    WHERE user_id NOT IN (SELECT id FROM public.users);

    -- Update orphaned sales_records
    UPDATE public.sales_records
    SET user_id = valid_user_id
    WHERE user_id NOT IN (SELECT id FROM public.users);
  END IF;
END $$;

-- Step 3: Add new constraints pointing to public.users
ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.products
ADD CONSTRAINT products_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_orders
ADD CONSTRAINT purchase_orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.shipping_invoices
ADD CONSTRAINT shipping_invoices_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.warehouse_snapshots
ADD CONSTRAINT warehouse_snapshots_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.sales_records
ADD CONSTRAINT sales_records_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
