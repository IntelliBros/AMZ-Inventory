-- Migrate all data from auth.users ID to public.users ID
-- This fixes the foreign key constraint issues

-- Define the IDs
DO $$
DECLARE
  old_user_id UUID := '2f173e0b-c509-4491-8bc6-c52591f1d04c'; -- auth.users ID
  new_user_id UUID := 'b44b8f19-a462-4463-9c91-9603b7702d23'; -- public.users ID
BEGIN
  -- Update suppliers
  UPDATE suppliers
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update products
  UPDATE products
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update purchase_orders
  UPDATE purchase_orders
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update shipping_invoices
  UPDATE shipping_invoices
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update warehouse_snapshots
  UPDATE warehouse_snapshots
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update sales_records
  UPDATE sales_records
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update team_members (both owner_id and member_id)
  UPDATE team_members
  SET owner_id = new_user_id
  WHERE owner_id = old_user_id;

  UPDATE team_members
  SET member_id = new_user_id
  WHERE member_id = old_user_id;

  RAISE NOTICE 'Successfully migrated all data from user % to user %', old_user_id, new_user_id;
END $$;
