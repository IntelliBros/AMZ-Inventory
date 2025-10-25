# Database Migration Instructions

## ⚠️ IMPORTANT: Run this migration to fix the "Failed to fetch" error

The app is currently failing because the database is missing the `total_delivered` column.

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor

Go to: https://cfezevhujazrtlzhfvmu.supabase.co/project/_/sql

### 2. Copy and Paste the SQL Below

```sql
-- Add total_delivered column to products table for tracking cumulative deliveries
ALTER TABLE products
ADD COLUMN IF NOT EXISTS total_delivered INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN products.total_delivered IS 'Cumulative total of all units delivered to Amazon warehouse. Used with warehouse snapshots to calculate sales: sales = total_delivered - snapshot_quantity';

-- Migrate existing warehouse inventory to total_delivered
-- This updates the total_delivered for each product based on current warehouse inventory
UPDATE products p
SET total_delivered = COALESCE(
  (SELECT SUM(il.quantity)
   FROM inventory_locations il
   WHERE il.product_id = p.id
   AND il.location_type = 'warehouse'),
  0
)
WHERE total_delivered = 0;

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
```

### 3. Click "Run" in the SQL Editor

### 4. Verify the Migration

Run this query to verify the column was added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name = 'total_delivered';
```

You should see:
```
column_name      | data_type | column_default
total_delivered  | integer   | 0
```

### 5. Restart Your Dev Server

```bash
npm run dev
```

## Optional: Clean Up Old Warehouse Inventory

After verifying everything works, you can optionally remove old warehouse inventory records:

```sql
-- ONLY run this after confirming the migration worked!
DELETE FROM inventory_locations WHERE location_type = 'warehouse';
```

## Troubleshooting

If you get an error about the column already existing, that's okay! It means it was partially created. Just run this simpler version:

```sql
-- Just create the function if column exists
CREATE OR REPLACE FUNCTION increment_total_delivered(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET total_delivered = total_delivered + p_quantity
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
```
