# Inventory Flow V2 - Implementation Plan

## Overview
Complete redesign of inventory flow to automate tracking from PO creation through delivery and sales.

## New Workflow

### 1. Create Purchase Order
**Status**: `in_production` (default)
- User creates PO with line items
- **AUTO**: System creates inventory records for each product as `in_production`
- Inventory records link to PO and line items
- User can see "Units in Production" on dashboard

### 2. Mark PO as In Storage
**Status**: `in_production` → `in_storage`
- User changes PO status to "In Storage"
- **AUTO**: Inventory records update from `in_production` to `in_storage`
- User can see "Units in Storage" on dashboard
- **REQUIREMENT**: PO must be in `in_storage` before creating shipment

### 3. Create Shipment
**Status**: Shipment `pending`
**Prerequisites**: PO must be `in_storage`

Steps:
1. User creates new shipment
2. User selects one or more POs to link
3. **AUTO**: System imports all products from selected POs
4. User enters quantity shipped for each product (can be partial)
5. System validates: quantity_shipped <= (quantity - quantity_already_shipped)
6. On save:
   - **AUTO**: Updates `po_line_items.quantity_shipped`
   - **AUTO**: Creates `shipping_line_items`
   - **AUTO**: Links shipment to POs via `shipment_pos` table
   - **AUTO**: Updates PO status:
     - If all items fully shipped → `fully_shipped`
     - If some items shipped → `partially_shipped`
   - **AUTO**: Converts inventory from `in_storage` to `en_route`
   - **AUTO**: Creates new inventory records as `en_route` with shipment details

### 4. Mark Shipment In Transit
**Status**: `pending` → `in_transit`
- User updates shipment status
- Inventory remains `en_route`
- User can track shipments in transit

### 5. Mark Shipment Delivered
**Status**: `in_transit` → `delivered`
- User marks shipment as delivered
- **AUTO**: Inventory converts from `en_route` to `warehouse`
- User can see "Units at Amazon Warehouse" on dashboard

### 6. Weekly Warehouse Inventory Input
**New Feature**: Warehouse Snapshots
- User inputs actual warehouse inventory counts (weekly recommended)
- System records snapshot with date
- **AUTO**: Calculates units sold:
  ```
  Units Sold = (Previous Snapshot + Units Received) - Current Snapshot
  ```
- **AUTO**: Creates `sales_records` entry
- Dashboard shows:
  - Total units sold (all time)
  - Sales by period
  - Sales velocity

## Database Changes

### Modified Tables

#### `po_line_items`
```sql
+ quantity_shipped INTEGER NOT NULL DEFAULT 0
```
Tracks how many units have been shipped to prevent double-shipping.

#### `shipping_invoices`
```sql
+ status shipment_status NOT NULL DEFAULT 'pending'
- po_id (removed - now many-to-many)
```
Added status tracking, removed single PO link.

#### `shipping_line_items`
```sql
+ po_line_item_id UUID REFERENCES po_line_items
```
Links back to original PO line item for tracking.

### New Tables

#### `shipment_pos`
Many-to-many relationship: One shipment can contain products from multiple POs.

#### `warehouse_snapshots`
Stores periodic inventory counts at Amazon warehouse.

#### `sales_records`
Auto-generated sales calculations between snapshots.

### Enum Updates

#### `po_status`
- OLD: `pending`, `in_production`, `shipped`, `received`, `cancelled`
- NEW: `in_production`, `in_storage`, `partially_shipped`, `fully_shipped`, `cancelled`

#### `location_type`
- OLD: `warehouse`, `en_route`, `storage`, `production`
- NEW: `warehouse`, `en_route`, `in_storage`, `in_production`

#### `shipment_status` (NEW)
- `pending` - Created but not yet shipped
- `in_transit` - En route to Amazon
- `delivered` - Arrived at Amazon warehouse

## Component Changes Needed

### 1. PurchaseOrderModal.tsx
- Update status options
- Add status change warning if trying to ship from `in_production`
- AUTO-create inventory on PO creation

### 2. ShippingInvoiceModal.tsx (Major Rewrite)
- Add PO selector (multi-select)
- Auto-import products from selected POs
- Show available quantities (ordered - already shipped)
- Validate shipped quantities
- Add shipment status field
- AUTO-convert inventory on creation

### 3. New: WarehouseSnapshotModal.tsx
- Product selector
- Date picker
- Quantity input
- Auto-calculate and show expected vs actual
- Show calculated sales

### 4. New: SalesTrackingPage.tsx
- View sales records
- Charts and graphs
- Sales by product
- Sales velocity metrics

### 5. Dashboard.tsx
- Update to show new location types
- Add sales summary section
- Show units by PO status

## Implementation Phases

### Phase 1: Database Migration ✅
- Run `database-migration-v2.sql`
- Update TypeScript types
- Test in Supabase

### Phase 2: PO Auto-Inventory (2-3 hours)
- Modify PO creation to auto-create inventory
- Update PO status flow
- Test PO → Inventory creation

### Phase 3: Shipment Redesign (4-5 hours)
- Rewrite shipping modal
- Multi-PO selection
- Auto-import products
- Quantity validation
- Auto-convert inventory
- Test full flow

### Phase 4: Warehouse Snapshots (2-3 hours)
- Create snapshot input page
- Auto-calculate sales
- Display sales data
- Test calculations

### Phase 5: Dashboard Updates (1-2 hours)
- Update stats
- Add sales section
- Update location displays

### Phase 6: Testing & Polish (2-3 hours)
- End-to-end testing
- Edge case handling
- UI/UX improvements

**Total Estimated Time**: 12-17 hours

## Migration Path for Existing Data

1. Backup database
2. Run migration script
3. Manually review PO statuses
4. Archive old inventory records or migrate
5. Test with new PO/Shipment creation

## Benefits

1. ✅ **Automated Tracking**: No manual inventory moves
2. ✅ **Prevent Errors**: Can't ship same units twice
3. ✅ **Sales Insights**: Automatic sales calculation
4. ✅ **Clear Status Flow**: Know exactly where inventory is
5. ✅ **Multi-PO Shipments**: Real-world flexibility
6. ✅ **Historical Data**: Track everything automatically

## Notes

- This is a breaking change requiring database migration
- Existing shipments may need manual review
- Consider running in parallel with old system initially
- Add rollback plan if needed
