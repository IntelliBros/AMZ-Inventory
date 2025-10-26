-- Add document URL columns to purchase_orders and shipping_invoices

-- Add document_url to purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add document_url to shipping_invoices
ALTER TABLE public.shipping_invoices
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.purchase_orders.document_url IS 'URL to uploaded invoice/document for this purchase order';
COMMENT ON COLUMN public.shipping_invoices.document_url IS 'URL to uploaded invoice/document for this shipping invoice';
