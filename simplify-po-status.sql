-- SIMPLIFICATION SCRIPT: Reduce PO statuses to only 'in_production' and 'complete'
-- Run this after the main migration if you want to simplify PO status tracking

-- Step 1: Update existing PO statuses to match new simplified flow
UPDATE purchase_orders
SET status = CASE
  WHEN status IN ('in_storage', 'partially_shipped', 'fully_shipped') THEN 'complete'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'in_production'
END::text::po_status;

-- Step 2: Drop the default constraint
ALTER TABLE purchase_orders ALTER COLUMN status DROP DEFAULT;

-- Step 3: Rename current enum
ALTER TYPE po_status RENAME TO po_status_old;

-- Step 4: Create new simplified enum
CREATE TYPE po_status AS ENUM ('in_production', 'complete', 'cancelled');

-- Step 5: Update the column with data migration
ALTER TABLE purchase_orders
ALTER COLUMN status TYPE po_status USING
  CASE
    WHEN status::text IN ('in_storage', 'partially_shipped', 'fully_shipped') THEN 'complete'::po_status
    WHEN status::text = 'cancelled' THEN 'cancelled'::po_status
    ELSE 'in_production'::po_status
  END;

-- Step 6: Drop old enum
DROP TYPE po_status_old;

-- Step 7: Re-add default
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'in_production'::po_status;

-- Step 8: Add comment
COMMENT ON TYPE po_status IS 'Simplified PO statuses: in_production (not yet in storage), complete (in storage and ready to ship), cancelled';
