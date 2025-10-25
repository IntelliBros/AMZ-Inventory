# Warehouse Snapshot Inventory Flow

## Overview

This document explains how the warehouse snapshot system tracks Amazon Warehouse inventory and calculates sales.

## Key Concept

The Amazon Warehouse inventory is **NOT** tracked in the `inventory_locations` table. Instead, it comes directly from warehouse snapshots, which represent actual physical counts at Amazon's warehouse.

## How It Works

### 1. Tracking Delivered Units

When a shipment is marked as "Delivered":
- The `products.total_delivered` field is incremented by the shipped quantity
- The `en_route` inventory is **deleted** (not moved to warehouse)
- This creates a hidden running total of all units ever delivered to Amazon

**Example:**
```
Shipment 1: 100 units delivered → total_delivered = 100
Shipment 2: 50 units delivered → total_delivered = 150
Shipment 3: 75 units delivered → total_delivered = 225
```

### 2. Recording Warehouse Snapshots

Periodically (e.g., weekly), you take a physical count at Amazon's warehouse and record it as a snapshot.

**Example Timeline:**
```
Week 1 Snapshot: 95 units (5 sold from first 100)
Week 2 Snapshot: 120 units (30 sold, but 50 more delivered)
Week 3 Snapshot: 180 units (15 sold, but 75 more delivered)
```

### 3. Calculating Sales

When you create a new snapshot, the system automatically calculates units sold between snapshots:

**Formula:**
```
units_sold = (previous_snapshot + units_delivered_in_period) - current_snapshot
```

**Example:**
```
Previous Snapshot: 100 units (on Jan 1)
Units Delivered: 50 units (between Jan 1 and Jan 8)
Current Snapshot: 120 units (on Jan 8)

Units Sold = (100 + 50) - 120 = 30 units
```

## Database Schema

### Products Table
```sql
ALTER TABLE products
ADD COLUMN total_delivered INTEGER NOT NULL DEFAULT 0;
```

This field tracks the cumulative total of all units delivered to Amazon warehouse.

### Warehouse Snapshots Table
```sql
CREATE TABLE warehouse_snapshots (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    product_id UUID REFERENCES products(id),
    snapshot_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT
);
```

### Sales Records Table
```sql
CREATE TABLE sales_records (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    product_id UUID REFERENCES products(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    units_sold INTEGER NOT NULL,
    starting_inventory INTEGER NOT NULL,
    ending_inventory INTEGER NOT NULL,
    units_received INTEGER NOT NULL
);
```

## Modified Components

### ShippingInvoiceList.tsx
`components/ShippingInvoiceList.tsx:54-113`

When marking a shipment as delivered:
- Increments `products.total_delivered` for each product
- Deletes the `en_route` inventory (no longer creates warehouse inventory)

### Dashboard.tsx
`components/Dashboard.tsx:48-88`

The Dashboard now:
- Skips `location_type = 'warehouse'` from `inventory_locations`
- Gets warehouse inventory from the latest snapshot for each product
- Displays snapshot quantities as "Amazon Warehouse" inventory

### WarehouseSnapshotModal.tsx
`components/WarehouseSnapshotModal.tsx:94-174`

When creating/updating a snapshot:
- Finds the previous snapshot for the product
- Calculates units delivered between snapshots (from shipping_line_items)
- Calculates units sold: `(previous + delivered) - current`
- Creates or updates a sales record with the calculated data

## Benefits of This Approach

1. **Accurate Inventory**: Warehouse inventory comes from actual physical counts, not system transactions
2. **Sales Tracking**: Automatically calculates sales between snapshots without manual entry
3. **Audit Trail**: Maintains history of warehouse counts over time
4. **Reconciliation**: Can identify discrepancies between expected and actual inventory

## Migration Instructions

### Step 1: Run the Database Migration

Execute the SQL migration file to add the `total_delivered` column:

```bash
# In Supabase SQL Editor, run:
psql -f add-total-delivered-tracking.sql
```

Or copy the contents of `add-total-delivered-tracking.sql` into the Supabase SQL Editor.

### Step 2: Migrate Existing Warehouse Inventory (Optional)

If you have existing warehouse inventory in `inventory_locations`:

1. The migration script automatically moves existing warehouse quantities to `total_delivered`
2. **Verify the migration**:
   ```sql
   SELECT p.name, p.total_delivered,
          COALESCE(SUM(il.quantity), 0) as warehouse_qty
   FROM products p
   LEFT JOIN inventory_locations il
     ON il.product_id = p.id AND il.location_type = 'warehouse'
   GROUP BY p.id, p.name, p.total_delivered;
   ```

3. Once verified, you can optionally delete old warehouse inventory:
   ```sql
   DELETE FROM inventory_locations WHERE location_type = 'warehouse';
   ```

### Step 3: Start Taking Snapshots

1. Go to the "Warehouse Snapshots" page
2. Click "New Snapshot"
3. Select a product and enter the current quantity at Amazon
4. Save the snapshot

From now on, Amazon Warehouse inventory will come from these snapshots!

## Example Workflow

### Week 1: Initial Snapshot
```
Action: Create first snapshot
Product: Widget A
Quantity: 0 units
Result: No sales calculated (no previous snapshot)
```

### Week 2: Receive Shipment + Snapshot
```
Action 1: Mark shipment as delivered (100 units)
Result: total_delivered = 100

Action 2: Create snapshot (95 units)
Result: Sales calculated = (0 + 100) - 95 = 5 units sold
```

### Week 3: Receive Another Shipment + Snapshot
```
Action 1: Mark shipment as delivered (50 units)
Result: total_delivered = 150

Action 2: Create snapshot (120 units)
Result: Sales calculated = (95 + 50) - 120 = 25 units sold
```

## Troubleshooting

### Issue: Sales calculation seems wrong

**Check:**
1. Are all delivered shipments between snapshots marked as "delivered"?
2. Is the snapshot date correct?
3. Does the previous snapshot exist?

### Issue: Warehouse inventory not showing on dashboard

**Check:**
1. Have you created at least one snapshot for the product?
2. Run this query to verify:
   ```sql
   SELECT * FROM warehouse_snapshots
   WHERE product_id = 'YOUR_PRODUCT_ID'
   ORDER BY snapshot_date DESC;
   ```

### Issue: total_delivered is incorrect

**Check:**
1. Verify all delivered shipments:
   ```sql
   SELECT p.name, p.total_delivered,
          SUM(sli.quantity) as total_from_shipments
   FROM products p
   LEFT JOIN shipping_line_items sli ON sli.product_id = p.id
   LEFT JOIN shipping_invoices si ON si.id = sli.shipping_invoice_id
   WHERE si.status = 'delivered'
   GROUP BY p.id, p.name, p.total_delivered;
   ```

## Files Modified

- `add-total-delivered-tracking.sql` - Database migration
- `components/ShippingInvoiceList.tsx` - Tracks total_delivered on delivery
- `components/Dashboard.tsx` - Shows warehouse inventory from snapshots
- `components/WarehouseSnapshotModal.tsx` - Updated sales calculation
- `app/page.tsx` - Fetches warehouse snapshots
- `types/database.types.ts` - Added total_delivered field type
