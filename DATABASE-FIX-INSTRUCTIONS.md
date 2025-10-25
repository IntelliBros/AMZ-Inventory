# Database Fix Instructions

## Problem 1: Location Type Enum
You're seeing: `invalid input value for enum location_type: "production"`

This means the database enum has the wrong values (`'in_storage'`, `'in_production'`) instead of the correct values (`'storage'`, `'production'`).

## Solution

You have **2 options**:

### Option 1: Run the Fix Script (Recommended if migration already ran)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the entire contents of: `fix-location-enum.sql`
4. Click **RUN**
5. Refresh your application

This will:
- Safely update the enum from `'in_storage'` → `'storage'`
- Safely update the enum from `'in_production'` → `'production'`
- Keep existing values `'warehouse'` and `'en_route'` unchanged
- Migrate any existing data automatically

### Option 2: Run the Full Migration Script (If not yet run)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the entire contents of: `database-migration-v2.sql`
4. Click **RUN**
5. Refresh your application

This is the complete migration that includes all changes (enum updates, new tables, etc.).

## What Changed

The location_type enum values are now:
```
OLD → NEW
'in_storage'    → 'storage'
'in_production' → 'production'
'warehouse'     → 'warehouse' (unchanged)
'en_route'      → 'en_route' (unchanged)
```

This matches how the database enum is actually defined and prevents the "invalid input value" error.

## Verification

After running the fix, verify it worked:

1. Try creating a new PO - should work without errors
2. Check the Inventory page - should display locations correctly
3. Check the Dashboard - should show correct location counters:
   - In Production
   - In Storage
   - En Route to Amazon
   - Amazon Warehouse

## Why This Happened

The TypeScript types were using the shorter names (`'storage'`, `'production'`) which match the actual database enum, but the code was initially written with longer names (`'in_storage'`, `'in_production'`). All code has now been updated to use the correct shorter names that match the database.

---

## Problem 2: Simplified PO Status Flow

The original design had complex PO statuses (`in_production`, `in_storage`, `partially_shipped`, `fully_shipped`). This has been simplified.

**New simplified flow:**
- PO has only 2 active statuses: **In Production** or **Complete**
- When PO is marked as **Complete**, inventory automatically moves to storage
- Shipments no longer link to POs - they only work with storage inventory

## Solution: Apply Simplification

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the entire contents of: `simplify-po-status.sql`
4. Click **RUN**
5. Refresh your application

This will:
- Update the `po_status` enum to only: `'in_production'`, `'complete'`, `'cancelled'`
- Migrate existing PO data (any PO that was `in_storage`, `partially_shipped`, or `fully_shipped` becomes `complete`)
- Keep the `cancelled` status for historical records

## New Workflow Summary

1. **Create PO** → Units automatically assigned to "production" location
2. **Mark PO as Complete** → Units automatically move to "storage" location
3. **Create Shipment** → Select from available storage inventory only (no PO linking needed)
4. **Submit Shipment** → Units move from "storage" to "en_route"
5. **Mark Shipment as Delivered** → Units move from "en_route" to "warehouse"
