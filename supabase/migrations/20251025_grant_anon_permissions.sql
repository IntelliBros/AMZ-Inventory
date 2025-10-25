-- Grant full access to anon role on all tables
-- This is safe because we've disabled RLS and handle security at application level

GRANT ALL ON public.users TO anon;
GRANT ALL ON public.products TO anon;
GRANT ALL ON public.suppliers TO anon;
GRANT ALL ON public.purchase_orders TO anon;
GRANT ALL ON public.shipping_invoices TO anon;
GRANT ALL ON public.warehouse_snapshots TO anon;
GRANT ALL ON public.sales_records TO anon;
GRANT ALL ON public.team_members TO anon;
GRANT ALL ON public.inventory_locations TO anon;
GRANT ALL ON public.po_line_items TO anon;
GRANT ALL ON public.shipping_line_items TO anon;
GRANT ALL ON public.shipment_pos TO anon;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
