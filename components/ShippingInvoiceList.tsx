'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import ShippingInvoiceModal from './ShippingInvoiceModal'

type ShippingInvoice = Database['public']['Tables']['shipping_invoices']['Row'] & {
  shipping_line_items: Array<{
    id: string
    shipping_invoice_id: string
    product_id: string
    quantity: number
    unit_shipping_cost: number
    total_shipping_cost: number
    products: {
      id: string
      sku: string
      name: string
    } | null
  }>
}

type Product = {
  id: string
  sku: string
  name: string
  current_shipping_cost: number
  carton_length_cm: number | null
  carton_width_cm: number | null
  carton_height_cm: number | null
  carton_weight_kg: number | null
  units_per_carton: number | null
}

interface ShippingInvoiceListProps {
  shippingInvoices: ShippingInvoice[]
  products: Product[]
}

export default function ShippingInvoiceList({ shippingInvoices, products }: ShippingInvoiceListProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<ShippingInvoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const router = useRouter()

  const handleEdit = (invoice: ShippingInvoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setSelectedInvoice(null)
    setIsModalOpen(false)
  }

  const handleFileUpload = async (invoice: ShippingInvoice, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingId(invoice.id)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/shipping-invoices/${invoice.id}/upload-document`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload document')
      }

      // Refresh the page to show the updated document
      window.location.reload()
    } catch (error: any) {
      console.error('Error uploading document:', error)
      alert(error.message || 'Failed to upload document')
    } finally {
      setUploadingId(null)
    }
  }

  const handleMarkAsDelivered = async (invoice: ShippingInvoice, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the edit modal

    if (!confirm(`Mark shipment ${invoice.invoice_number} as delivered? This will move inventory to Amazon receiving.`)) {
      return
    }

    setUpdating(invoice.id)

    try {
      // Update shipment status to delivered via API
      const response = await fetch(`/api/shipping-invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'delivered' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark as delivered')
      }

      router.refresh()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setUpdating(null)
    }
  }

  const handleMarkAsComplete = async (invoice: ShippingInvoice, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the edit modal

    if (!confirm(`Mark shipment ${invoice.invoice_number} as complete? This will move inventory from receiving to FBA (available for sale).`)) {
      return
    }

    setUpdating(invoice.id)

    try {
      // Update shipment status to complete via API
      const response = await fetch(`/api/shipping-invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'complete' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark as complete')
      }

      router.refresh()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setUpdating(null)
    }
  }

  if (shippingInvoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No shipping invoices found. Create your first shipping invoice to track shipping costs.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {shippingInvoices.map((invoice) => {
            const totalUnits = invoice.shipping_line_items.reduce((sum, item) => sum + item.quantity, 0)

            return (
              <li key={invoice.id}>
                <div
                  className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEdit(invoice)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-indigo-600">
                          Invoice #{invoice.invoice_number}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          invoice.status === 'complete' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'delivered' ? 'bg-orange-100 text-orange-800' :
                          invoice.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status === 'complete' ? 'Complete' :
                           invoice.status === 'delivered' ? 'Delivered' :
                           invoice.status === 'in_transit' ? 'In Transit' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
                        <span className="font-medium text-gray-900">{invoice.carrier}</span>
                        <span>Shipped: {new Date(invoice.shipping_date).toLocaleDateString()}</span>
                        {invoice.tracking_number && (
                          <span className="truncate">Tracking: {invoice.tracking_number}</span>
                        )}
                      </div>
                      {invoice.notes && (
                        <p className="mt-1 text-xs text-gray-500 italic line-clamp-1" title={invoice.notes}>{invoice.notes}</p>
                      )}
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">
                          ${invoice.total_shipping_cost.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {totalUnits} units ({invoice.shipping_line_items.length} {invoice.shipping_line_items.length === 1 ? 'product' : 'products'})
                        </p>
                      </div>

                      {/* Upload/View Invoice Button */}
                      {invoice.document_url ? (
                        <a
                          href={invoice.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 border border-[#FF9900] text-[#FF9900] text-xs font-medium rounded-md hover:bg-[#FF9900] hover:text-white transition-colors whitespace-nowrap"
                          title="View uploaded invoice"
                        >
                          View Invoice
                        </a>
                      ) : (
                        <label
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                          title="Upload invoice document"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(invoice, e)}
                            disabled={uploadingId === invoice.id}
                          />
                          {uploadingId === invoice.id ? 'Uploading...' : 'Upload Invoice'}
                        </label>
                      )}

                      {/* Show appropriate button based on status */}
                      {invoice.status === 'delivered' ? (
                        <button
                          onClick={(e) => handleMarkAsComplete(invoice, e)}
                          disabled={updating === invoice.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {updating === invoice.id ? 'Updating...' : 'Mark as Complete'}
                        </button>
                      ) : invoice.status !== 'complete' && (
                        <button
                          onClick={(e) => handleMarkAsDelivered(invoice, e)}
                          disabled={updating === invoice.id}
                          className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {updating === invoice.id ? 'Updating...' : 'Mark as Delivered'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {isModalOpen && selectedInvoice && (
        <ShippingInvoiceModal
          shippingInvoice={selectedInvoice}
          products={products}
          onClose={handleClose}
        />
      )}
    </>
  )
}
