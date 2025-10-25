-- MIGRATION SCRIPT: Inventory Flow V2
-- This script updates the database for the new automated inventory flow

-- Step 1: Update location_type enum
ALTER TYPE location_type RENAME TO location_type_old;
CREATE TYPE location_type AS ENUM ('warehouse', 'en_route', 'storage', 'production');
ALTER TABLE inventory_locations ALTER COLUMN location_type TYPE location_type USING
  CASE
    WHEN location_type::text = 'in_storage' THEN 'storage'
    WHEN location_type::text = 'in_production' THEN 'production'
    ELSE location_type::text
  END::location_type;
DROP TYPE location_type_old;

-- Step 2: Update po_status enum (with proper default handling)
-- First, drop the default constraint
ALTER TABLE purchase_orders ALTER COLUMN status DROP DEFAULT;

-- Rename old enum and create new one
ALTER TYPE po_status RENAME TO po_status_old;
CREATE TYPE po_status AS ENUM ('in_production', 'in_storage', 'partially_shipped', 'fully_shipped', 'cancelled');

-- Update the column type with data migration
ALTER TABLE purchase_orders ALTER COLUMN status TYPE po_status USING
  CASE
    WHEN status::text = 'pending' THEN 'in_production'
    WHEN status::text = 'in_production' THEN 'in_production'
    WHEN status::text = 'shipped' THEN 'fully_shipped'
    WHEN status::text = 'received' THEN 'fully_shipped'
    WHEN status::text = 'cancelled' THEN 'cancelled'
    ELSE 'in_production'
  END::po_status;

-- Drop old enum
DROP TYPE po_status_old;

-- Re-add the default with the new enum value
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'in_production'::po_status;

-- Step 3: Create shipment_status enum
CREATE TYPE shipment_status AS ENUM ('pending', 'in_transit', 'delivered');

-- Step 4: Add new columns
ALTER TABLE po_line_items ADD COLUMN IF NOT EXISTS quantity_shipped INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipping_invoices ADD COLUMN IF NOT EXISTS status shipment_status NOT NULL DEFAULT 'pending';
ALTER TABLE shipping_invoices DROP COLUMN IF EXISTS po_id;
ALTER TABLE shipping_line_items ADD COLUMN IF NOT EXISTS po_line_item_id UUID REFERENCES po_line_items(id) ON DELETE SET NULL;

-- Step 5: Create new tables
CREATE TABLE IF NOT EXISTS shipment_pos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    shipping_invoice_id UUID REFERENCES shipping_invoices(id) ON DELETE CASCADE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(shipping_invoice_id, po_id)
);

CREATE TABLE IF NOT EXISTS warehouse_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    snapshot_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    UNIQUE(user_id, product_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS sales_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    units_sold INTEGER NOT NULL,
    starting_inventory INTEGER NOT NULL,
    ending_inventory INTEGER NOT NULL,
    units_received INTEGER NOT NULL DEFAULT 0
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_shipment_pos_shipping_id ON shipment_pos(shipping_invoice_id);
CREATE INDEX IF NOT EXISTS idx_shipment_pos_po_id ON shipment_pos(po_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_user_id ON warehouse_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_product_id ON warehouse_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_date ON warehouse_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_sales_records_user_id ON sales_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_product_id ON sales_records(product_id);
CREATE INDEX IF NOT EXISTS idx_shipping_line_items_po_line_item ON shipping_line_items(po_line_item_id);

-- Step 7: Enable RLS
ALTER TABLE shipment_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for shipment_pos
CREATE POLICY "Users can view shipment POs for their shipments" ON shipment_pos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipment_pos.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert shipment POs for their shipments" ON shipment_pos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipment_pos.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shipment POs for their shipments" ON shipment_pos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shipping_invoices
            WHERE shipping_invoices.id = shipment_pos.shipping_invoice_id
            AND shipping_invoices.user_id = auth.uid()
        )
    );

-- Step 9: Create RLS policies for warehouse_snapshots
CREATE POLICY "Users can view their own warehouse snapshots" ON warehouse_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own warehouse snapshots" ON warehouse_snapshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warehouse snapshots" ON warehouse_snapshots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warehouse snapshots" ON warehouse_snapshots
    FOR DELETE USING (auth.uid() = user_id);

-- Step 10: Create RLS policies for sales_records
CREATE POLICY "Users can view their own sales records" ON sales_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales records" ON sales_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 11: Add comments
COMMENT ON TABLE shipment_pos IS 'Links shipments to multiple purchase orders';
COMMENT ON TABLE warehouse_snapshots IS 'Weekly inventory counts at Amazon warehouse for tracking sales';
COMMENT ON TABLE sales_records IS 'Calculated sales between warehouse snapshots';
