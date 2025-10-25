-- Create users table for custom authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- Add user_id column reference to users table for all existing tables
-- Update products table
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_user_id_fkey,
  ADD CONSTRAINT products_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- Update suppliers table
ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey,
  ADD CONSTRAINT suppliers_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- Update purchase_orders table
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_user_id_fkey,
  ADD CONSTRAINT purchase_orders_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- Update shipping_invoices table
ALTER TABLE public.shipping_invoices
  DROP CONSTRAINT IF EXISTS shipping_invoices_user_id_fkey,
  ADD CONSTRAINT shipping_invoices_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- Update warehouse_snapshots table
ALTER TABLE public.warehouse_snapshots
  DROP CONSTRAINT IF EXISTS warehouse_snapshots_user_id_fkey,
  ADD CONSTRAINT warehouse_snapshots_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- Update sales_records table
ALTER TABLE public.sales_records
  DROP CONSTRAINT IF EXISTS sales_records_user_id_fkey,
  ADD CONSTRAINT sales_records_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;
