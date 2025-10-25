import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface POLineItem {
  quantity: number
  unit_cost: number
  total_cost: number
  products: {
    sku: string
    name: string
  } | null
}

interface PurchaseOrder {
  po_number: string
  supplier: string
  order_date: string
  expected_delivery_date: string | null
  status: string
  total_product_cost: number
  notes: string | null
  po_line_items: POLineItem[]
}

export function generatePurchaseOrderPDF(po: PurchaseOrder) {
  const doc = new jsPDF()

  // Add company header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PURCHASE ORDER', 105, 20, { align: 'center' })

  // Add PO details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Left column
  doc.text(`PO Number: ${po.po_number}`, 20, 35)
  doc.text(`Supplier: ${po.supplier}`, 20, 42)
  doc.text(`Order Date: ${new Date(po.order_date).toLocaleDateString()}`, 20, 49)

  // Right column
  const statusLabel = po.status.replace('_', ' ').toUpperCase()
  doc.text(`Status: ${statusLabel}`, 140, 35)
  if (po.expected_delivery_date) {
    doc.text(`Expected Delivery: ${new Date(po.expected_delivery_date).toLocaleDateString()}`, 140, 42)
  }

  // Add line items table
  const tableData = po.po_line_items.map((item) => [
    item.products?.sku || 'N/A',
    item.products?.name || 'Unknown Product',
    item.quantity.toString(),
    `$${item.unit_cost.toFixed(2)}`,
    `$${item.total_cost.toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: 60,
    head: [['SKU', 'Product', 'Quantity', 'Unit Cost', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo color
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 30 }, // SKU
      1: { cellWidth: 80 }, // Product
      2: { cellWidth: 25, halign: 'center' }, // Quantity
      3: { cellWidth: 25, halign: 'right' }, // Unit Cost
      4: { cellWidth: 30, halign: 'right' }, // Total
    },
    footStyles: {
      fillColor: [243, 244, 246], // Light gray
      textColor: 0,
      fontStyle: 'bold',
    },
  })

  // Add total
  const finalY = (doc as any).lastAutoTable.finalY || 60
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL: $${po.total_product_cost.toFixed(2)}`, 190, finalY + 10, { align: 'right' })

  // Add notes if present
  if (po.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', 20, finalY + 25)
    doc.setFont('helvetica', 'normal')

    const splitNotes = doc.splitTextToSize(po.notes, 170)
    doc.text(splitNotes, 20, finalY + 32)
  }

  // Add footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    105,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`PO-${po.po_number}.pdf`)
}
