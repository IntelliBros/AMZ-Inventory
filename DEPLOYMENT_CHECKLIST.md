# Deployment Checklist - Sales-Based Inventory System

## Overview
This checklist covers the deployment of the sales-based inventory system that replaces warehouse snapshots with direct sales tracking and FIFO inventory consumption.

---

## Pre-Deployment

### ✅ Code Changes (COMPLETED)
- [x] Sales snapshot API routes created
- [x] FIFO inventory utility implemented
- [x] Sales import page with CSV upload
- [x] Sales display page with period grouping
- [x] Inventory display updated with "At Amazon" breakdown
- [x] Dashboard updated to show FBA + Receiving
- [x] Warehouse snapshot code removed
- [x] Navigation updated
- [x] All code committed to git
- [x] Build compiles successfully (31 pages)

### ⬜ Database Migration (READY TO RUN)
- [ ] **Step 1:** Open Supabase Dashboard → SQL Editor
- [ ] **Step 2:** Copy contents of `/supabase/migrations/20251105_sales_based_inventory_system.sql`
- [ ] **Step 3:** Paste and execute in SQL Editor
- [ ] **Step 4:** Verify sales_snapshots table exists
- [ ] **Step 5:** Verify shipping_invoices has new columns
- [ ] **Step 6:** Verify 'receiving' enum values added
- [ ] **Step 7:** Verify warehouse_snapshots table dropped

**See `MIGRATION_INSTRUCTIONS.md` for detailed steps**

---

## Testing Phase

### Test 1: Shipment Receiving Workflow
- [ ] Create or select a shipping invoice with status "In Transit"
- [ ] Mark it as "Receiving" and set first_received_date
- [ ] Verify inventory moves from en_route → receiving
- [ ] Verify inventory shows in "At Amazon" > "⏳ Receiving" section
- [ ] Mark it as "Delivered" and set fully_received_date
- [ ] Verify inventory moves from receiving → fba
- [ ] Verify inventory shows in "At Amazon" > "✓ Available (FBA)" section
- [ ] Check inventory_history for proper notes with dates

### Test 2: Sales Import CSV
- [ ] Go to /sales-import page
- [ ] Create a test CSV file:
   ```csv
   SKU,Units Sold,Revenue
   TEST-001,10,250.00
   TEST-002,5,125.00
   ```
- [ ] Select period dates (e.g., last week)
- [ ] Upload CSV and verify preview shows correctly
- [ ] Click "Import" button
- [ ] Verify success message shows "2 sales snapshots created"
- [ ] Check that FBA inventory decreased by correct amounts (FIFO)
- [ ] Verify inventory_history shows negative quantities for sales

### Test 3: Sales Display
- [ ] Go to /sales page
- [ ] Verify sales periods show as expandable cards
- [ ] Verify period shows correct date range
- [ ] Verify total units and revenue are accurate
- [ ] Click to expand period
- [ ] Verify product breakdown table shows correctly
- [ ] Test delete button on a snapshot
- [ ] Verify inventory is restored after deletion

### Test 4: Inventory Display
- [ ] Go to /inventory page
- [ ] Verify "At Amazon" card shows with orange border
- [ ] Verify it displays combined total (FBA + Receiving)
- [ ] Verify breakdown shows:
   - ✓ Available (FBA): X units
   - ⏳ Receiving: X units
- [ ] Verify other location cards show: In Transit, In Storage, In Production
- [ ] Check product cards show "At Amazon" section with breakdown
- [ ] Verify color coding: FBA=green, Receiving=orange

### Test 5: Dashboard
- [ ] Go to / (home/dashboard)
- [ ] Verify "At Amazon (FBA + Receiving)" card shows
- [ ] Verify it combines both location types
- [ ] Verify total inventory value is correct
- [ ] Verify location breakdown percentages add up to 100%

---

## Edge Cases to Test

### Edge Case 1: Insufficient Inventory for Sales
- [ ] Try to import sales CSV with more units than available
- [ ] Verify error message shows which products don't have enough inventory
- [ ] Verify no sales snapshot is created
- [ ] Verify inventory is not consumed

### Edge Case 2: Duplicate Sales Period
- [ ] Import sales for a specific product and period
- [ ] Try to import same product and period again
- [ ] Verify error message about duplicate
- [ ] Verify only one snapshot exists

### Edge Case 3: Sales Consuming from Receiving
- [ ] Ensure a product has 0 FBA inventory but some in Receiving
- [ ] Import sales for that product
- [ ] Verify sales consume from Receiving inventory (FIFO fallback)
- [ ] Verify inventory_history notes reflect this

### Edge Case 4: Delete Sales Snapshot
- [ ] Create a sales snapshot
- [ ] Note the inventory levels before/after
- [ ] Delete the snapshot
- [ ] Verify inventory is restored
- [ ] Verify a new FBA inventory record is created with correct quantity

---

## Deployment Steps

### Step 1: Push Code to Git
```bash
git push origin main
```

### Step 2: Deploy to Vercel (or your hosting platform)
If using Vercel CLI:
```bash
vercel --prod
```

Or push to main branch and Vercel will auto-deploy.

### Step 3: Monitor Deployment
- [ ] Check deployment logs for errors
- [ ] Verify build completes successfully
- [ ] Check that all 31 pages are generated

### Step 4: Smoke Test Production
- [ ] Visit production URL
- [ ] Log in with test account
- [ ] Navigate through all main pages
- [ ] Check browser console for errors
- [ ] Verify API calls succeed (Network tab)

---

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error logs in Vercel/hosting dashboard
- [ ] Monitor Supabase logs for database errors
- [ ] Check for any user-reported issues
- [ ] Verify sales imports work in production
- [ ] Verify shipment workflow works end-to-end

### First Week
- [ ] Collect user feedback on new interface
- [ ] Monitor performance (page load times)
- [ ] Check for any edge cases users encounter
- [ ] Verify FIFO inventory consumption is accurate
- [ ] Review inventory_history for anomalies

---

## Rollback Plan (If Needed)

### Quick Rollback
1. **Revert code deployment:**
   ```bash
   git revert HEAD
   git push origin main
   ```
   Or rollback to previous deployment in Vercel dashboard

2. **Restore database (if migration was run):**
   - Run rollback SQL from MIGRATION_INSTRUCTIONS.md
   - Restore from backup if needed

### Full Rollback
- [ ] Revert all git commits back to before Phase 2
- [ ] Run database rollback script
- [ ] Deploy previous working version
- [ ] Verify system is operational

---

## Success Criteria

All of these must be true for successful deployment:
- [ ] ✅ Build compiles with no errors
- [ ] ✅ Database migration runs successfully
- [ ] ✅ All manual tests pass
- [ ] ✅ No errors in production logs
- [ ] ✅ Users can mark shipments as "Receiving" and "Delivered"
- [ ] ✅ Users can import sales CSV files
- [ ] ✅ Sales snapshots display correctly by period
- [ ] ✅ Inventory shows "At Amazon" breakdown
- [ ] ✅ FIFO inventory consumption works correctly
- [ ] ✅ Sales snapshot deletion restores inventory
- [ ] ✅ No warehouse snapshot references remain

---

## Support & Documentation

### Key Files
- `/DEVELOPMENT_PLAN.md` - Full implementation plan with all phases
- `/MIGRATION_INSTRUCTIONS.md` - Database migration steps
- `/supabase/migrations/20251105_sales_based_inventory_system.sql` - Migration SQL
- `/lib/fifo-inventory.ts` - FIFO inventory logic
- `/app/api/sales-snapshots/` - Sales snapshot API routes

### Troubleshooting
- Check Supabase logs: Dashboard → Logs
- Check Vercel logs: Dashboard → Logs
- Check browser console: F12 → Console tab
- Verify environment variables are set correctly
- Ensure service role key has proper permissions

---

## Notes
- The migration drops the `warehouse_snapshots` table - this is intentional (fresh start)
- All existing inventory locations are preserved
- Delivered shipments will have dates automatically set during migration
- Sales import supports both SKU and ASIN matching
- FIFO consumption prioritizes FBA inventory, then falls back to Receiving
