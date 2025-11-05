-- Add delivery_date column to shipping_invoices table
ALTER TABLE shipping_invoices
ADD COLUMN delivery_date DATE;

-- Add comment to explain the field
COMMENT ON COLUMN shipping_invoices.delivery_date IS 'The actual date the shipment was delivered (only set when status is delivered)';
