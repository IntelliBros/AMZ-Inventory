'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
}

interface ShippingInvoiceListProps {
  shippingInvoices: ShippingInvoice[]
  products: Product[]
}

export default function ShippingInvoiceList({ shippingInvoices, products }: ShippingInvoiceListProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<ShippingInvoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleEdit = (invoice: ShippingInvoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setSelectedInvoice(null)
    setIsModalOpen(false)
  }

  const handleMarkAsDelivered = async (invoice: ShippingInvoice, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the edit modal

    if (!confirm(`Mark shipment ${invoice.invoice_number} as delivered? This will update total delivered units.`)) {
      return
    }

    setUpdating(invoice.id)

    try {
      // Update shipment status to delivered
      const updateData = {
        status: 'delivered' as const
      } satisfies Database['public']['Tables']['shipping_invoices']['Update']

      const { error: updateError } = await supabase
        .from('shipping_invoices')
        .update(updateData)
        .eq('id', invoice.id)

      if (updateError) throw updateError

      // Update total_delivered for each product in this shipment
      for (const lineItem of invoice.shipping_line_items) {
        const { error: productError } = await supabase.rpc('increment_total_delivered', {
          p_product_id: lineItem.product_id,
          p_quantity: lineItem.quantity
        })

        if (productError) {
          // If RPC doesn't exist yet, fall back to manual update
          const { data: product } = await supabase
            .from('products')
            .select('total_delivered')
            .eq('id', lineItem.product_id)
            .single()

          if (product) {
            const { error: updateProductError } = await supabase
              .from('products')
              .update({ total_delivered: (product.total_delivered || 0) + lineItem.quantity })
              .eq('id', lineItem.product_id)

            if (updateProductError) throw updateProductError
          }
        }
      }

      // Remove en_route inventory (delivered units are now tracked in total_delivered)
      const { error: inventoryError } = await supabase
        .from('inventory_locations')
        .delete()
        .like('notes', `Shipment ${invoice.invoice_number}%`)
        .eq('location_type', 'en_route')

      if (inventoryError) throw inventoryError

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
                          invoice.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status === 'in_transit' ? 'In Transit' :
                           invoice.status === 'delivered' ? 'Delivered' : 'Pending'}
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
                      {invoice.status !== 'delivered' && (
                        <button
                          onClick={(e) => handleMarkAsDelivered(invoice, e)}
                          disabled={updating === invoice.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
