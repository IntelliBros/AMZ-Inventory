# Purchase Order PDF Download Feature

## Overview

You can now download professional PDF versions of your Purchase Orders directly from the application!

## How to Use

1. **Navigate to Purchase Orders page**
   - Click "Purchase Orders" in the navigation menu

2. **Download a PO**
   - Find the purchase order you want to download
   - Click the "Download PDF" button on the right side of the PO
   - The PDF will automatically download to your browser's download folder

## PDF Contents

Each Purchase Order PDF includes:

### Header Section
- **PO Number**: Unique identifier
- **Supplier**: Supplier name
- **Order Date**: When the order was placed
- **Expected Delivery**: Estimated delivery date (if set)
- **Status**: Current status (In Production, Complete, etc.)

### Line Items Table
Professional table with:
- **SKU**: Product SKU
- **Product**: Full product name
- **Quantity**: Units ordered
- **Unit Cost**: Cost per unit
- **Total**: Line item total

### Summary
- **Grand Total**: Total cost of all products
- **Notes**: Any notes attached to the PO

### Footer
- Timestamp of when the PDF was generated

## PDF Filename Format

PDFs are automatically named: `PO-{PO_NUMBER}.pdf`

Example: `PO-001.pdf`, `PO-2024-01.pdf`

## Technical Details

- **Library**: jsPDF with autotable plugin
- **Format**: Professional business format
- **Colors**: Branded with indigo headers matching the app theme
- **File Size**: Optimized and lightweight

## Use Cases

1. **Send to Suppliers**: Email the PDF to your supplier as the official order
2. **Record Keeping**: Archive PDFs for your business records
3. **Printing**: Print physical copies for your files
4. **Sharing**: Share with team members or accountants
5. **Backup**: Keep offline copies of your purchase orders

## Future Enhancements

Potential future additions:
- Company logo/branding customization
- Custom header/footer text
- Multiple language support
- Batch download multiple POs
- Email directly from the app

## Support

If you encounter any issues with PDF generation, please check:
- Your browser allows downloads
- You have sufficient disk space
- Pop-up blockers are not preventing downloads
