# Changes Made - Amazon FBA Inventory Manager

## Summary of Updates

### 1. Separated Shipping from Purchase Orders

**Previous Behavior:**
- POs included both product costs and shipping costs in one record
- Total shipping cost was a single field on the PO

**New Behavior:**
- POs now ONLY track product costs
- Shipping is tracked separately through Shipping Invoices
- Each PO can have multiple shipping invoices (split shipments)
- More accurate tracking of when costs are incurred

**Benefits:**
- Realistic workflow: products are ordered, then shipped separately
- Support for partial shipments (3 of 5 units in one shipment)
- Better cost allocation as shipping happens
- Clearer separation of concerns

### 2. Removed Product Cost Display from Products Page

**Previous Behavior:**
- Product cards showed current unit cost and shipping cost

**New Behavior:**
- Product cards show only SKU, name, description, ASIN, FNSKU
- Costs are reference values only (not displayed prominently)
- Actual costs are tracked per inventory batch

**Benefits:**
- Cleaner UI focused on product identification
- Reduces confusion about which cost to use
- Costs vary by batch, so displaying one "current" cost is misleading

### 3. Split Shipment Support

**New Feature:**
- One PO can have multiple shipping invoices
- Each shipping invoice can contain partial quantities
- Example workflow:
  1. Create PO for 100 units of Product A
  2. First shipment: 60 units shipped (create shipping invoice #1)
  3. Second shipment: 40 units shipped (create shipping invoice #2)

**Implementation:**
- Shipping invoices link to POs (optional)
- Line items on shipping invoices specify quantity shipped
- Can ship different quantities than ordered (adjustments)

### 4. Fixed Input Text Colors

**Issue:**
- Input fields in modals had gray/invisible text
- Hard to see what was being typed

**Solution:**
- Added global CSS rules to ensure all inputs have black text
- Placeholders remain gray for visibility
- Disabled inputs have gray text (appropriate)

## Database Schema Changes

### Modified Tables:

**purchase_orders:**
- REMOVED: `total_shipping_cost` field
- Kept: `total_product_cost` field

**No changes to:**
- products table (kept current_cost and current_shipping_cost as reference values)
- shipping_invoices table (already designed correctly)
- shipping_line_items table (already designed correctly)
- inventory_locations table
- po_line_items table

## Updated Components

### Modified Components:
1. **PurchaseOrderModal.tsx** - Removed shipping cost fields
2. **PurchaseOrderList.tsx** - Removed shipping cost display
3. **ProductList.tsx** - Removed cost display
4. **ShippingInvoiceModal.tsx** - NEW: Full support for split shipments
5. **ShippingInvoiceList.tsx** - NEW: Display shipping invoices
6. **AddShippingInvoiceButton.tsx** - NEW: Button component

### CSS Updates:
- **globals.css** - Added rules to force black text in all inputs

## Migration Notes

If you already ran the old schema, you need to update your database:

```sql
-- Remove shipping cost from purchase orders
ALTER TABLE purchase_orders DROP COLUMN total_shipping_cost;
```

If starting fresh, just run the updated `supabase-schema.sql` file.

## Testing Checklist

- [ ] Create a product
- [ ] Create a PO with multiple line items
- [ ] Verify PO shows only product costs (no shipping)
- [ ] Create first shipping invoice linked to PO
- [ ] Add partial quantities (e.g., 3 of 5 units)
- [ ] Create second shipping invoice for same PO
- [ ] Add remaining quantities (e.g., 2 of 5 units)
- [ ] Verify both shipping invoices show correct PO link
- [ ] Create inventory from shipping invoice
- [ ] Verify all input text is visible (black)
- [ ] Check dashboard calculations

## Benefits of These Changes

1. **More Accurate Workflow**: Matches real-world process where orders and shipping are separate events
2. **Better Cost Tracking**: Costs are allocated when they actually occur
3. **Flexibility**: Handle partial shipments, multiple carriers, split deliveries
4. **Cleaner UI**: Removed confusing/redundant information
5. **Professional**: Follows accounting best practices for COGS tracking

## Future Enhancements

With this foundation, you can now add:
- Automatic inventory creation from shipping invoices
- Alerts when shipped quantity doesn't match PO quantity
- Shipping cost per unit automatic calculation
- Reports on shipping efficiency
- Integration with shipping carriers for tracking
