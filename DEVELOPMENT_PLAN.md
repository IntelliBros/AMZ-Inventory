# Sales-Based Inventory System - Development Plan

## Overview
Complete restructure from warehouse snapshot-based sales calculations to direct sales tracking with FIFO inventory consumption. This eliminates the fundamental problem where gradual shipment arrivals skew inventory snapshots.

## Architecture Changes

### Old System (Broken)
- Warehouse snapshots capture inventory at points in time
- Sales = Starting Inventory - Ending Inventory + New Arrivals
- Problem: New arrivals timing is fuzzy during 1-3 week receiving periods

### New System (Accurate)
- Sales snapshots record actual Amazon sales data (weekly import)
- Inventory flows: storage → en_route → receiving → fba
- Sales consume from FBA inventory using FIFO
- Warehouse snapshots eliminated entirely

---

## Progress Tracker

### ✅ Phase 1: Database & Core Infrastructure (COMPLETED)

#### ✅ 1.1 Database Migration
- [x] Create sales_snapshots table
  - Fields: team_id, product_id, period_start, period_end, units_sold, revenue, snapshot_date, notes
  - Unique constraint: team_id + product_id + period_start + period_end
- [x] Add 'receiving' to shipment status enum
- [x] Add 'receiving' to location_type enum
- [x] Add first_received_date column to shipping_invoices
- [x] Add fully_received_date column to shipping_invoices
- [x] Migrate existing delivery_date data to fully_received_date
- [x] Set existing delivered shipments: first_received_date = fully_received_date = shipping_date

#### ✅ 1.2 TypeScript Types
- [x] Add sales_snapshots table to database.types.ts
- [x] Update ShipmentStatus type: 'pending' | 'in_transit' | 'receiving' | 'delivered'
- [x] Update shipping_invoices types with first_received_date and fully_received_date
- [x] Remove delivery_date from types

#### ✅ 1.3 Shipping Invoice Components
- [x] Update ShippingInvoiceModal status dropdown
  - [x] Add "Receiving" option
- [x] Add "First Received Date" field
  - [x] Required when status = receiving or delivered
  - [x] Disabled when status ≠ receiving/delivered
- [x] Add "Fully Received Date" field
  - [x] Required when status = delivered
  - [x] Disabled when status ≠ delivered
- [x] Update handleStatusChange to validate and send dates
- [x] Update form submission to include new date fields

#### ✅ 1.4 Shipping Invoice API Routes
- [x] Update PATCH /api/shipping-invoices/[id]
  - [x] Accept first_received_date and fully_received_date
  - [x] Handle "receiving" status transition: en_route → receiving
  - [x] Handle "delivered" status transition: receiving → fba
  - [x] Update inventory notes with actual dates
- [x] Update POST /api/shipping-invoices
  - [x] Accept first_received_date and fully_received_date in request body
  - [x] Include in invoiceData object
- [x] Update GET query in /app/shipping/page.tsx
  - [x] Select first_received_date and fully_received_date

---

### ✅ Phase 2: Sales Snapshots System (COMPLETED - API)

#### ✅ 2.1 Sales Snapshot API Routes
- [x] Create /app/api/sales-snapshots/route.ts
  - [x] GET: List all sales snapshots for current team
    - [x] Filter by date range (optional)
    - [x] Include product details
  - [x] POST: Create new sales snapshot
    - [x] Validate team access
    - [x] Check for duplicate (team + product + period)
    - [x] Validate sufficient inventory exists
    - [x] Create snapshot record
    - [x] Call FIFO inventory removal function

- [x] Create /app/api/sales-snapshots/[id]/route.ts
  - [x] GET: Get specific snapshot with details
  - [x] DELETE: Delete snapshot
    - [x] Check team permissions
    - [x] Restore inventory (reverse FIFO removal)
    - [x] Delete record

- [x] Create /app/api/sales-snapshots/import-csv/route.ts
  - [x] POST: Bulk import from CSV
    - [x] Parse CSV data
    - [x] Validate all products exist
    - [x] Validate sufficient inventory
    - [x] Create snapshots individually
    - [x] Apply FIFO removal for each
    - [x] Return summary (success/errors)

#### ✅ 2.2 FIFO Sales Inventory Removal
- [x] Create /lib/fifo-inventory.ts utility
  - [x] Function: removeSalesFromInventory(productId, quantity, teamId, saleDate)
    - [x] Query FBA inventory for product (order by created_at ASC)
    - [x] If insufficient FBA, take from receiving (order by created_at ASC)
    - [x] Consume inventory FIFO (delete or reduce quantities)
    - [x] Create inventory_history records
    - [x] Return consumed inventory details

  - [x] Function: restoreSalesInventory(productId, quantity, teamId, originalInventory)
    - [x] Recreate inventory records that were consumed
    - [x] Used when deleting sales snapshots
    - [x] Maintain historical accuracy

  - [x] Function: checkInventoryAvailability(productId, quantity, teamId)
    - [x] Check FBA and Receiving totals
    - [x] Return availability status

#### ✅ 2.3 Sales Import Page (COMPLETED)
- [x] Create /app/sales-import/page.tsx
  - [x] File upload component (CSV only)
  - [x] Period date range selector (start/end)
  - [x] CSV format instructions
  - [x] Preview table before import
  - [x] Validation messages
  - [x] Import button with loading state
  - [x] Success/error summary after import

- [x] Create /components/SalesImportForm.tsx
  - [x] Drag & drop file upload
  - [x] CSV parsing using PapaParse or similar
  - [x] Column mapping (SKU/ASIN → product_id)
  - [x] Preview grid showing parsed data
  - [x] Validation: Check products exist, check inventory available
  - [x] Submit to /api/sales-snapshots/import-csv

Expected CSV Format:
```csv
SKU,Units Sold,Revenue
ABC123,50,1250.00
DEF456,30,750.00
```

---

### ✅ Phase 3: Sales Display & Management (COMPLETED)

#### ✅ 3.1 Update Sales List Page
- [x] Update /app/sales/page.tsx
  - [x] Change query from warehouse_snapshots to sales_snapshots
  - [x] Group by period (period_start, period_end)
  - [x] Calculate totals per period
  - [x] Fetch product details for each snapshot
  - [x] Format: "Sales for Jan 1 - Jan 7, 2025"

- [x] Create /components/SalesSnapshotList.tsx
  - [x] Show periods as cards
  - [x] Display: Date range, Total units, Total revenue
  - [x] Click to expand: Show product breakdown
  - [x] Delete button per snapshot (with confirmation)
  - [x] Link to import new sales

#### ⬜ 3.2 Sales Analytics (Optional Enhancement)
- [ ] Create /components/SalesChart.tsx
  - [ ] Chart sales over time
  - [ ] Filter by product
  - [ ] Show trends

---

### ✅ Phase 4: Inventory Display Updates (COMPLETED)

#### ✅ 4.1 Update Inventory Page
- [x] Update /app/inventory/page.tsx
  - [x] Query to aggregate by location_type including 'receiving'
  - [x] Calculate totals:
    - [x] At Amazon = fba + receiving
    - [x] FBA Available
    - [x] Receiving (being checked in)
    - [x] En Route
    - [x] Storage

- [x] Update /components/InventoryList.tsx
  - [x] New section: "AT AMAZON FULFILLMENT CENTER"
    - [x] Show total (fba + receiving)
    - [x] Show breakdown with icons:
      - [x] ✓ Available (FBA): X units ($X)
      - [x] ⏳ Receiving: X units ($X)
  - [x] Keep existing sections:
    - [x] 🚚 In Transit (En Route)
    - [x] 📦 In Storage

- [x] Update product detail cards
  - [x] Add "Receiving" location
  - [x] Show "At Amazon" section with FBA + Receiving breakdown
  - [x] Color code: FBA = green, Receiving = orange

---

### ✅ Phase 5: Cleanup & Removal (COMPLETED)

#### ✅ 5.1 Remove Warehouse Snapshots
- [x] Delete /app/warehouse-snapshots/page.tsx
- [x] Delete /components/WarehouseSnapshotList.tsx
- [x] Delete /components/WarehouseSnapshotModal.tsx
- [x] Delete /app/api/warehouse-snapshots/route.ts
- [x] Delete /app/api/warehouse-snapshots/[id]/route.ts
- [x] Remove warehouse_snapshots queries from pages
- [x] Update Dashboard to use direct inventory queries
- [x] Update InventoryList to remove warehouseSnapshots prop

#### ✅ 5.2 Update Navigation
- [x] Update /components/Sidebar.tsx
  - [x] Remove "Warehouse Snapshots" link
  - [x] "Sales" link goes to /sales (sales snapshots)
  - [x] "Import Sales" button added to /sales page

#### ✅ 5.3 Clean Up Old Sales Calculations
- [x] Search codebase for references to warehouse_snapshots
- [x] Remove old warehouse snapshot usage from Dashboard
- [x] Update all components to use new location types (fba, receiving)

---

### ⬜ Phase 6: Testing & Deployment

#### ⬜ 6.1 Run Database Migration
- [ ] Test migration on local Supabase (if running)
- [ ] Run on production: Execute SQL in Supabase dashboard
- [ ] Verify:
  - [ ] sales_snapshots table created
  - [ ] receiving enum values added
  - [ ] date columns added/renamed
  - [ ] warehouse_snapshots dropped

#### ⬜ 6.2 Manual Testing
- [ ] Create new shipping invoice
- [ ] Mark as "Receiving" with first_received_date
  - [ ] Verify inventory moves en_route → receiving
  - [ ] Check inventory history notes
- [ ] Mark as "Delivered" with fully_received_date
  - [ ] Verify inventory moves receiving → fba
  - [ ] Check inventory history notes
- [ ] Import sales CSV
  - [ ] Verify snapshots created
  - [ ] Verify FIFO inventory consumption
  - [ ] Check FBA inventory reduced correctly
- [ ] View inventory page
  - [ ] Verify "At Amazon" section shows correctly
  - [ ] Verify receiving inventory displayed
- [ ] View sales page
  - [ ] Verify periods display correctly
  - [ ] Verify product breakdowns accurate
- [ ] Delete a sales snapshot
  - [ ] Verify inventory restored

#### ⬜ 6.3 Edge Cases
- [ ] Test: Sales exceed available FBA + Receiving inventory
  - [ ] Should show validation error
- [ ] Test: Mark shipment as delivered without setting receiving first
  - [ ] Should work (direct en_route → fba for old shipments)
- [ ] Test: Multiple sales snapshots for same product/period
  - [ ] Should prevent duplicates (unique constraint)
- [ ] Test: Delete shipment that's in receiving status
  - [ ] Inventory should return to storage

#### ⬜ 6.4 Build & Deploy
- [ ] Run `npm run build` locally
- [ ] Fix any TypeScript errors
- [ ] Fix any linting issues
- [ ] Commit final changes
- [ ] Push to git
- [ ] Deploy to Vercel production
- [ ] Run migration SQL on production Supabase
- [ ] Verify production deployment works
- [ ] Test key workflows on production

---

## Migration Notes

### For Existing Users
1. Existing "delivered" shipments will have first_received_date = fully_received_date = shipping_date
2. Existing "in_transit" shipments will need dates added manually when updated
3. Warehouse snapshots will be deleted (fresh start as requested)
4. Users will need to import their first sales snapshot to begin tracking

### Data Integrity
- FIFO consumption maintains cost basis accuracy
- Inventory movements are tracked in inventory_locations (audit trail)
- Sales snapshots are immutable once created (can only delete)
- Unique constraints prevent duplicate sales records

---

## Key Files Reference

### Database
- `/supabase/migrations/20251105_sales_based_inventory_system.sql`
- `/types/database.types.ts`

### Components
- `/components/ShippingInvoiceModal.tsx` - Updated ✅
- `/components/SalesImportForm.tsx` - To create
- `/components/SalesList.tsx` - To update
- `/components/InventoryDisplay.tsx` - To update

### API Routes
- `/app/api/shipping-invoices/[id]/route.ts` - Updated ✅
- `/app/api/shipping-invoices/route.ts` - Updated ✅
- `/app/api/sales-snapshots/route.ts` - To create
- `/app/api/sales-snapshots/[id]/route.ts` - To create
- `/app/api/sales-snapshots/import-csv/route.ts` - To create

### Pages
- `/app/shipping/page.tsx` - Updated ✅
- `/app/sales/page.tsx` - To update
- `/app/sales-import/page.tsx` - To create
- `/app/inventory/page.tsx` - To update
- `/app/warehouse-snapshots/page.tsx` - To delete

### Utilities
- `/lib/fifo-inventory.ts` - To create

---

## Success Criteria

- [x] Shipments can be marked as "Receiving"
- [x] Shipments can be marked as "Delivered"
- [x] Inventory moves through: en_route → receiving → fba
- [ ] Sales can be imported from CSV weekly
- [ ] Sales consume inventory using FIFO
- [ ] Inventory page shows "At Amazon" with breakdown
- [ ] Sales page shows actual sales snapshots
- [ ] No references to warehouse_snapshots remain
- [ ] All tests pass
- [ ] Successfully deployed to production

---

## Current Status

**Last Updated:** 2025-11-05

**Phase:** 5 (COMPLETED) - All UI and cleanup work finished

**Next Task:** Phase 6 - Testing & Deployment

**Blockers:** Need to run database migration on production

**Notes:**
- Build compiles successfully ✅
- All Phase 1-5 tasks completed ✅
- Migration SQL ready at `/supabase/migrations/20251105_sales_based_inventory_system.sql`
- Ready for database migration and testing
