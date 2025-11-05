# Database Migration Instructions

## Migration: Sales-Based Inventory System

This migration adds the sales snapshots system and updates the inventory flow to include a "receiving" status.

### What This Migration Does

1. **Creates `sales_snapshots` table** - Stores actual sales data from Amazon reports
2. **Updates `shipping_invoices` table** - Adds `first_received_date` and `fully_received_date` columns
3. **Adds 'receiving' status** - To both `shipment_status` and `location_type` enums
4. **Migrates existing data** - Sets dates for delivered shipments
5. **Drops `warehouse_snapshots` table** - No longer needed (fresh start)

### How to Run the Migration

#### Option 1: Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `/supabase/migrations/20251105_sales_based_inventory_system.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
7. Wait for confirmation message

#### Option 2: Supabase CLI

If your project is linked to Supabase CLI:

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Verification Steps

After running the migration, verify these changes:

1. **Check sales_snapshots table exists:**
   ```sql
   SELECT * FROM sales_snapshots LIMIT 1;
   ```
   Expected: Empty table (no error)

2. **Check shipping_invoices columns:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'shipping_invoices'
   AND column_name IN ('first_received_date', 'fully_received_date');
   ```
   Expected: 2 rows showing DATE type

3. **Check receiving status exists:**
   ```sql
   SELECT enumlabel
   FROM pg_enum
   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shipment_status')
   ORDER BY enumlabel;
   ```
   Expected: List includes 'receiving'

4. **Check warehouse_snapshots is gone:**
   ```sql
   SELECT * FROM warehouse_snapshots LIMIT 1;
   ```
   Expected: Error "relation does not exist"

### Rollback (If Needed)

If you need to rollback this migration:

1. **Backup your data first!**
2. Run the rollback script:
   ```sql
   -- Recreate warehouse_snapshots (if you have backup data)
   -- Remove receiving enum values (requires recreating the types)
   -- Drop sales_snapshots table
   DROP TABLE IF EXISTS sales_snapshots CASCADE;

   -- Remove shipping invoice columns
   ALTER TABLE shipping_invoices
   DROP COLUMN IF EXISTS first_received_date,
   DROP COLUMN IF EXISTS fully_received_date;
   ```

### Post-Migration Tasks

After successful migration:

- [ ] Test shipment receiving workflow (mark as "Receiving", then "Delivered")
- [ ] Test sales CSV import
- [ ] Verify inventory displays show FBA and Receiving correctly
- [ ] Deploy updated application code
- [ ] Monitor for any errors in production

### Support

If you encounter issues:
- Check Supabase logs in Dashboard → Logs
- Verify your service role key has proper permissions
- Ensure no active connections are blocking the migration
