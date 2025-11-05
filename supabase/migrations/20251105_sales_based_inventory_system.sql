-- Sales-Based Inventory System Migration
-- This migration replaces warehouse snapshots with sales snapshots

-- 1. Create sales_snapshots table
CREATE TABLE IF NOT EXISTS public.sales_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  units_sold INTEGER NOT NULL CHECK (units_sold >= 0),
  revenue DECIMAL(10, 2) NOT NULL CHECK (revenue >= 0),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  CONSTRAINT sales_snapshots_team_product_period UNIQUE (team_id, product_id, period_start, period_end)
);

-- Add indexes for sales_snapshots
CREATE INDEX idx_sales_snapshots_team_id ON public.sales_snapshots(team_id);
CREATE INDEX idx_sales_snapshots_product_id ON public.sales_snapshots(product_id);
CREATE INDEX idx_sales_snapshots_period ON public.sales_snapshots(period_start, period_end);

-- Add RLS policies for sales_snapshots
ALTER TABLE public.sales_snapshots ENABLE ROW LEVEL SECURITY;

-- 2. Update shipping_invoices table
ALTER TABLE public.shipping_invoices
  ADD COLUMN IF NOT EXISTS first_received_date DATE,
  ADD COLUMN IF NOT EXISTS fully_received_date DATE;

-- Rename delivery_date to fully_received_date if delivery_date exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipping_invoices'
    AND column_name = 'delivery_date'
  ) THEN
    -- Copy data from delivery_date to fully_received_date
    UPDATE public.shipping_invoices
    SET fully_received_date = delivery_date
    WHERE delivery_date IS NOT NULL AND fully_received_date IS NULL;

    -- Drop the old column
    ALTER TABLE public.shipping_invoices DROP COLUMN delivery_date;
  END IF;
END $$;

-- Update status enum to include 'receiving' and 'complete'
DO $$
BEGIN
  -- Check if the type exists and doesn't have 'receiving' yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'receiving'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shipment_status')
  ) THEN
    ALTER TYPE shipment_status ADD VALUE 'receiving' AFTER 'in_transit';
  END IF;

  -- Check if the type exists and doesn't have 'complete' yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'complete'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shipment_status')
  ) THEN
    ALTER TYPE shipment_status ADD VALUE 'complete' AFTER 'delivered';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If shipment_status type doesn't exist, it will be created by the schema
    NULL;
END $$;

-- 3. Update inventory_locations for receiving location type
-- Add receiving to location_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'receiving'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'location_type')
  ) THEN
    ALTER TYPE location_type ADD VALUE 'receiving' AFTER 'en_route';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Migrate existing data
-- For delivered shipments, set first_received_date = fully_received_date = shipping_date
UPDATE public.shipping_invoices
SET
  first_received_date = shipping_date,
  fully_received_date = shipping_date
WHERE
  status = 'delivered'
  AND first_received_date IS NULL
  AND fully_received_date IS NULL;

-- 5. Add comments
COMMENT ON TABLE public.sales_snapshots IS 'Records of actual sales from Amazon reports, replacing calculated warehouse snapshots';
COMMENT ON COLUMN public.shipping_invoices.first_received_date IS 'Date when first units arrived at Amazon warehouse (receiving started)';
COMMENT ON COLUMN public.shipping_invoices.fully_received_date IS 'Date when all units were fully received and available at Amazon';

-- 6. Drop warehouse_snapshots table if it exists (fresh start as requested)
DROP TABLE IF EXISTS public.warehouse_snapshots CASCADE;
