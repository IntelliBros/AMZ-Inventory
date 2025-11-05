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

### 🔄 Phase 2: Sales Snapshots System (IN PROGRESS)

#### ⬜ 2.1 Sales Snapshot API Routes
- [ ] Create /app/api/sales-snapshots/route.ts
  - [ ] GET: List all sales snapshots for current team
    - [ ] Filter by date range (optional)
    - [ ] Group by period (optional)
    - [ ] Include product details
  - [ ] POST: Create new sales snapshot
    - [ ] Validate team access
    - [ ] Check for duplicate (team + product + period)
    - [ ] Validate sufficient inventory exists
    - [ ] Create snapshot record
    - [ ] Call FIFO inventory removal function

- [ ] Create /app/api/sales-snapshots/[id]/route.ts
  - [ ] GET: Get specific snapshot with details
  - [ ] DELETE: Delete snapshot
    - [ ] Check team permissions
    - [ ] Restore inventory (reverse FIFO removal)
    - [ ] Delete record

- [ ] Create /app/api/sales-snapshots/import-csv/route.ts
  - [ ] POST: Bulk import from CSV
    - [ ] Parse CSV data
    - [ ] Validate all products exist
    - [ ] Validate sufficient inventory
    - [ ] Create snapshots in transaction
    - [ ] Apply FIFO removal for all
    - [ ] Return summary (success/errors)

#### ⬜ 2.2 FIFO Sales Inventory Removal
- [ ] Create /lib/fifo-inventory.ts utility
  - [ ] Function: removeSalesFromInventory(productId, quantity, teamId, saleDate)
    - [ ] Query FBA inventory for product (order by created_at ASC)
    - [ ] If insufficient FBA, take from receiving (order by created_at ASC)
    - [ ] Consume inventory FIFO (delete or reduce quantities)
    - [ ] Create inventory_history records
    - [ ] Return consumed inventory details

  - [ ] Function: restoreSalesInventory(productId, quantity, teamId, originalInventory)
    - [ ] Recreate inventory records that were consumed
    - [ ] Used when deleting sales snapshots
    - [ ] Maintain historical accuracy

#### ⬜ 2.3 Sales Import Page
- [ ] Create /app/sales-import/page.tsx
  - [ ] File upload component (CSV only)
  - [ ] Period date range selector (start/end)
  - [ ] CSV format instructions
  - [ ] Preview table before import
  - [ ] Validation messages
  - [ ] Import button with loading state
  - [ ] Success/error summary after import

- [ ] Create /components/SalesImportForm.tsx
  - [ ] Drag & drop file upload
  - [ ] CSV parsing using PapaParse or similar
  - [ ] Column mapping (SKU/ASIN → product_id)
  - [ ] Preview grid showing parsed data
  - [ ] Validation: Check products exist, check inventory available
  - [ ] Submit to /api/sales-snapshots/import-csv

Expected CSV Format:
```csv
SKU,Units Sold,Revenue
ABC123,50,1250.00
DEF456,30,750.00
```

---

### ⬜ Phase 3: Sales Display & Management

#### ⬜ 3.1 Update Sales List Page
- [ ] Update /app/sales/page.tsx
  - [ ] Change query from warehouse_snapshots to sales_snapshots
  - [ ] Group by period (period_start, period_end)
  - [ ] Calculate totals per period
  - [ ] Fetch product details for each snapshot
  - [ ] Format: "Sales for Jan 1 - Jan 7, 2025"

- [ ] Update /components/SalesList.tsx (or create if new)
  - [ ] Show periods as cards
  - [ ] Display: Date range, Total units, Total revenue
  - [ ] Click to expand: Show product breakdown
  - [ ] Delete button per snapshot (with confirmation)
  - [ ] Link to import new sales

#### ⬜ 3.2 Sales Analytics (Optional Enhancement)
- [ ] Create /components/SalesChart.tsx
  - [ ] Chart sales over time
  - [ ] Filter by product
  - [ ] Show trends

---

### ⬜ Phase 4: Inventory Display Updates

#### ⬜ 4.1 Update Inventory Page
- [ ] Update /app/inventory/page.tsx
  - [ ] Query to aggregate by location_type including 'receiving'
  - [ ] Calculate totals:
    - [ ] At Amazon = fba + receiving
    - [ ] FBA Available
    - [ ] Receiving (being checked in)
    - [ ] En Route
    - [ ] Storage

- [ ] Update /components/InventoryDisplay.tsx
  - [ ] New section: "AT AMAZON FULFILLMENT CENTER"
    - [ ] Show total (fba + receiving)
    - [ ] Show breakdown with icons:
      - [ ] ✓ Available (FBA): X units ($X)
      - [ ] ⏳ Receiving: X units ($X)
  - [ ] Keep existing sections:
    - [ ] 🚚 In Transit (En Route)
    - [ ] 📦 In Storage

- [ ] Update product detail table
  - [ ] Add "Receiving" column
  - [ ] Add "Total at Amazon" column (FBA + Receiving)
  - [ ] Color code: Receiving = yellow/orange

---

### ⬜ Phase 5: Cleanup & Removal

#### ⬜ 5.1 Remove Warehouse Snapshots
- [ ] Delete /app/warehouse-snapshots/page.tsx
- [ ] Delete /components/WarehouseSnapshotList.tsx
- [ ] Delete /components/AddWarehouseSnapshotButton.tsx
- [ ] Delete /components/WarehouseSnapshotModal.tsx (if exists)
- [ ] Delete /app/api/warehouse-snapshots/route.ts
- [ ] Delete /app/api/warehouse-snapshots/[id]/route.ts
- [ ] Remove warehouse_snapshots table from database.types.ts (already in migration)

#### ⬜ 5.2 Update Navigation
- [ ] Update /components/MainLayout.tsx (or wherever nav is)
  - [ ] Remove "Warehouse Snapshots" link
  - [ ] Ensure "Sales" link goes to /sales (snapshots)
  - [ ] Add "Import Sales" link (or make it a button on /sales page)

#### ⬜ 5.3 Clean Up Old Sales Calculations
- [ ] Search codebase for references to warehouse_snapshots
- [ ] Remove any old sales calculation logic
- [ ] Update any remaining references

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

**Phase:** 1 (Complete), Starting Phase 2

**Next Task:** Create Sales Snapshot API Routes (2.1)

**Blockers:** None

**Notes:**
- Build compiles successfully ✅
- Migration SQL ready but not yet applied to database
- Need to run migration before testing new features
