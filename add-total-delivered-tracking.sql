-- Add total_delivered column to products table for tracking cumulative deliveries
ALTER TABLE products
ADD COLUMN IF NOT EXISTS total_delivered INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN products.total_delivered IS 'Cumulative total of all units delivered to Amazon warehouse. Used with warehouse snapshots to calculate sales: sales = total_delivered - snapshot_quantity';

-- Migrate existing warehouse inventory to total_delivered
-- This updates the total_delivered for each product based on current warehouse inventory
-- Only update if total_delivered is still 0 (prevents overwriting existing data)
UPDATE products p
SET total_delivered = COALESCE(
  (SELECT SUM(il.quantity)
   FROM inventory_locations il
   WHERE il.product_id = p.id
   AND il.location_type = 'warehouse'),
  0
)
WHERE total_delivered = 0;

-- Optional: Remove warehouse inventory records (commented out for safety)
-- Only run this after verifying the migration worked correctly
-- DELETE FROM inventory_locations WHERE location_type = 'warehouse';

-- Create a function to atomically increment total_delivered
-- This prevents race conditions when multiple shipments are delivered simultaneously
CREATE OR REPLACE FUNCTION increment_total_delivered(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET total_delivered = total_delivered + p_quantity
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
