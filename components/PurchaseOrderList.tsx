'use client'

import { useState } from 'react'
import { Database } from '@/types/database.types'
import PurchaseOrderModal from './PurchaseOrderModal'
import { generatePurchaseOrderPDF } from '@/lib/pdfGenerator'

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  po_line_items: Array<{
    id: string
    po_id: string
    product_id: string
    quantity: number
    unit_cost: number
    total_cost: number
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
  current_cost: number
}

type Supplier = {
  id: string
  name: string
}

interface PurchaseOrderListProps {
  purchaseOrders: PurchaseOrder[]
  products: Product[]
  suppliers: Supplier[]
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border border-gray-300',
  in_production: 'bg-blue-50 text-blue-700 border border-blue-300',
  in_storage: 'bg-purple-50 text-purple-700 border border-purple-300',
  partially_shipped: 'bg-yellow-50 text-yellow-700 border border-yellow-300',
  fully_shipped: 'bg-green-50 text-green-700 border border-green-300',
  cancelled: 'bg-red-50 text-red-700 border border-red-300',
  complete: 'bg-emerald-50 text-emerald-700 border border-emerald-300',
}

const statusLabels = {
  pending: 'Pending',
  in_production: 'In Production',
  in_storage: 'In Storage',
  partially_shipped: 'Partially Shipped',
  fully_shipped: 'Fully Shipped',
  cancelled: 'Cancelled',
  complete: 'Complete',
}

export default function PurchaseOrderList({ purchaseOrders, products, suppliers }: PurchaseOrderListProps) {
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const handleEdit = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setSelectedPO(null)
    setIsModalOpen(false)
  }

  const handleDownloadPDF = (po: PurchaseOrder, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the edit modal
    generatePurchaseOrderPDF(po)
  }

  const handleFileUpload = async (po: PurchaseOrder, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingId(po.id)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/purchase-orders/${po.id}/upload-document`, {
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

  if (purchaseOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No purchase orders found. Create your first purchase order to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {purchaseOrders.map((po) => {
          const totalItems = po.po_line_items.reduce((sum, item) => sum + item.quantity, 0)
          const totalValue = po.total_product_cost

          return (
            <div
              key={po.id}
              className="bg-white rounded-lg shadow-sm border border-[#D5D9D9] hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEdit(po)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-6">
                  {/* Left Section - PO Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-[#0F1111]">
                        PO #{po.po_number}
                      </h3>
                      <span className={`px-3 py-1 text-xs font-bold rounded ${statusColors[po.status]}`}>
                        {statusLabels[po.status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mb-3">
                      <div className="flex items-center text-[#0F1111] font-medium">
                        <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {po.supplier}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Ordered: {new Date(po.order_date).toLocaleDateString()}
                      </div>
                      {po.expected_delivery_date && (
                        <div className="flex items-center text-gray-600">
                          <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Expected: {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-5 text-sm text-gray-600">
                      <span>{totalItems} units</span>
                      <span>•</span>
                      <span>{po.po_line_items.length} {po.po_line_items.length === 1 ? 'product' : 'products'}</span>
                    </div>

                    {po.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600 italic line-clamp-1" title={po.notes}>
                          {po.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Totals & Actions */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-[160px]">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Total Value</div>
                      <div className="text-2xl font-bold text-[#0F1111]">
                        ${totalValue.toFixed(2)}
                      </div>
                    </div>

                    {/* Buttons on the same row */}
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={(e) => handleDownloadPDF(po, e)}
                        className="inline-flex items-center px-4 py-2 border border-[#D5D9D9] shadow-sm text-sm font-medium rounded text-[#0F1111] bg-white hover:bg-gray-50 transition-colors flex-1 justify-center"
                        title="Download PDF"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </button>

                      {/* Upload/View Invoice Button */}
                      {po.document_url ? (
                        <a
                          href={po.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center px-4 py-2 border border-[#FF9900] shadow-sm text-sm font-medium rounded text-[#FF9900] bg-white hover:bg-[#FF9900] hover:text-white transition-colors flex-1 justify-center"
                          title="View uploaded invoice"
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Invoice
                        </a>
                      ) : (
                        <label
                          className="inline-flex items-center px-4 py-2 border border-[#D5D9D9] shadow-sm text-sm font-medium rounded text-[#0F1111] bg-white hover:bg-gray-50 transition-colors flex-1 justify-center cursor-pointer"
                          title="Upload invoice document"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(po, e)}
                            disabled={uploadingId === po.id}
                          />
                          {uploadingId === po.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Upload Invoice
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {isModalOpen && selectedPO && (
        <PurchaseOrderModal
          purchaseOrder={selectedPO}
          products={products}
          suppliers={suppliers}
          onClose={handleClose}
        />
      )}
    </>
  )
}
