# Fixes Applied - Location Types & Delivery Button

## Issues Fixed

### 1. Location Type Mapping
**Problem:** The code was using `'in_storage'` and `'in_production'` but the database enum uses `'storage'` and `'production'`.

**Solution:** Updated all location type references to match the database:
- `'in_production'` → `'production'`
- `'in_storage'` → `'storage'`
- Kept `'warehouse'` and `'en_route'` as-is (they were correct)

**Files Modified:**
- `components/PurchaseOrderModal.tsx`
  - Auto-create inventory now uses `'production'` or `'storage'`
  - Status change handler uses correct types
- `components/ShippingInvoiceModal.tsx`
  - Inventory conversion from `'storage'` to `'en_route'`
- `components/Dashboard.tsx`
  - Updated location stats keys to match database enum

### 2. Partial Shipment Support
**Problem:** When shipping only partial quantities from a PO, the system needed to properly handle:
- Moving only the shipped quantity to "en_route"
- Keeping remaining units in "storage"

**Solution:** Implemented FIFO (First In, First Out) inventory consumption:
```typescript
// In ShippingInvoiceModal.tsx
for (const item of lineItems) {
  // Find all storage inventory for this product across selected POs
  const { data: storageInventories } = await supabase
    .from('inventory_locations')
    .select('*')
    .eq('product_id', item.product_id)
    .eq('location_type', 'storage')
    .in('po_id', selectedPOIds)

  let remainingToShip = item.quantity

  // Reduce storage inventory (FIFO)
  for (const storage of storageInventories) {
    if (remainingToShip <= 0) break

    if (storage.quantity <= remainingToShip) {
      // Fully consume this storage record
      await supabase
        .from('inventory_locations')
        .delete()
        .eq('id', storage.id)

      remainingToShip -= storage.quantity
    } else {
      // Partially consume this storage record (keeps rest in storage)
      await supabase
        .from('inventory_locations')
        .update({ quantity: storage.quantity - remainingToShip })
        .eq('id', storage.id)

      remainingToShip = 0
    }
  }

  // Create en_route inventory for shipped quantity only
  await supabase
    .from('inventory_locations')
    .insert({
      product_id: item.product_id,
      location_type: 'en_route',
      quantity: item.quantity, // Only the shipped amount
      unit_cost: item.unit_cost,
      unit_shipping_cost: item.unit_shipping_cost,
      po_id: selectedPOIds[0],
      notes: `Shipment ${formData.invoice_number}`,
    })
}
```

### 3. Mark as Delivered Button
**Problem:** No easy way to mark shipments as delivered from the shipments list page.

**Solution:** Added "Mark as Delivered" button to each shipment in the list:

**Files Modified:**
- `components/ShippingInvoiceList.tsx`
  - Added imports: `useRouter`, `createClient`
  - Added state: `updating` (tracks which shipment is being updated)
  - Added `handleMarkAsDelivered` function:
    - Updates shipment status to 'delivered'
    - Converts inventory from 'en_route' to 'warehouse'
    - Shows loading state during update
  - Added button to UI:
    - Only visible for non-delivered shipments
    - Shows appropriate text based on status
    - Prevents opening edit modal when clicked
    - Disables during update

**Button Behavior:**
- Shows for shipments with status `pending` or `in_transit`
- Hidden for shipments already marked as `delivered`
- Click stops propagation (doesn't open edit modal)
- Confirms action with user
- Updates shipment status and inventory in one transaction
- Shows loading state: "Updating..."
- Refreshes page after successful update

## Complete Flow Now Works As Expected

### Create PO → Mark as In Storage
1. Create PO with status "In Production"
   - Inventory created as `'production'`
2. Change PO status to "In Storage"
   - Inventory automatically updated to `'storage'`
   - Shows in "In Storage" counter on dashboard

### Create Partial Shipment
1. Select PO in "In Storage" status
2. Products auto-imported with available quantities
3. Ship partial quantity (e.g., 50 out of 100 units)
4. On save:
   - 50 units moved to `'en_route'` (new record)
   - 50 units remain in `'storage'` (existing record reduced)
   - PO status updated to `'partially_shipped'`

### Mark as Delivered
1. Click "Mark as Delivered" button on shipment
2. Confirm action
3. System automatically:
   - Updates shipment status to 'delivered'
   - Converts inventory from `'en_route'` to `'warehouse'`
   - Shows in "Amazon Warehouse" counter on dashboard

## Testing Checklist

- [x] Create PO with "In Production" status → Inventory shows as "In Production"
- [x] Change PO to "In Storage" → Inventory moves to "In Storage"
- [x] Create shipment with full quantity → All inventory moves to "En Route"
- [x] Create shipment with partial quantity → Only shipped units move to "En Route", rest stays in "Storage"
- [x] Click "Mark as Delivered" → Inventory moves to "Amazon Warehouse"
- [x] Dashboard shows correct counts for all 4 location types
- [x] Partial shipments work correctly (FIFO inventory consumption)
- [x] Button only shows for non-delivered shipments
- [x] Button disabled during update with loading state

## Location Type Reference

```
Database Enum: location_type
- 'warehouse' → Amazon Warehouse (final destination)
- 'en_route' → En Route to Amazon (in transit)
- 'storage' → In Storage (ready to ship)
- 'production' → In Production (being manufactured)
```

All code now consistently uses these exact enum values!
