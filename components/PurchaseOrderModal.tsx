'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  po_line_items?: Array<{
    id: string
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

type POStatus = 'in_production' | 'in_storage' | 'complete'

interface Product {
  id: string
  sku: string
  name: string
  current_cost: number
}

interface Supplier {
  id: string
  name: string
}

interface LineItem {
  product_id: string
  quantity: number
  unit_cost: number
}

interface PurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder | null
  products: Product[]
  suppliers: Supplier[]
  onClose: () => void
}

const statuses: { value: POStatus; label: string }[] = [
  { value: 'in_production', label: 'In Production' },
  { value: 'in_storage', label: 'Complete (In Storage)' },
]

export default function PurchaseOrderModal({ purchaseOrder, products, suppliers, onClose }: PurchaseOrderModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    po_number: purchaseOrder?.po_number || '',
    supplier: purchaseOrder?.supplier || '',
    order_date: purchaseOrder?.order_date || new Date().toISOString().split('T')[0],
    expected_delivery_date: purchaseOrder?.expected_delivery_date || '',
    status: purchaseOrder?.status || 'in_production' as POStatus,
    notes: purchaseOrder?.notes || '',
  })

  const [previousStatus, setPreviousStatus] = useState<POStatus | null>(
    purchaseOrder?.status as POStatus || null
  )

  const [lineItems, setLineItems] = useState<LineItem[]>(
    purchaseOrder?.po_line_items?.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    })) || [{ product_id: '', quantity: 0, unit_cost: 0 }]
  )

  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity: 0, unit_cost: 0 }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    if (field === 'product_id') {
      updated[index][field] = value as string
      // Auto-fill unit cost from product
      const product = products.find(p => p.id === value)
      if (product) {
        updated[index].unit_cost = product.current_cost
      }
    } else {
      updated[index][field] = value as number
    }
    setLineItems(updated)
  }

  const calculateTotals = () => {
    const productTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
    return {
      productTotal,
      grandTotal: productTotal,
    }
  }

  // Handle status change: move inventory to storage when marked as in_storage
  const handleStatusChange = async (poId: string, oldStatus: POStatus | null, newStatus: POStatus) => {
    if (!oldStatus || oldStatus === newStatus) return

    const response = await fetch(`/api/purchase-orders/${poId}/change-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        old_status: oldStatus,
        new_status: newStatus,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to change status')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate line items
      if (lineItems.length === 0 || lineItems.some(item => !item.product_id || item.quantity <= 0)) {
        throw new Error('Please add at least one valid line item')
      }

      const totals = calculateTotals()

      const poData = {
        po_number: formData.po_number,
        supplier_id: formData.supplier,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        status: formData.status,
        total_product_cost: totals.productTotal,
        notes: formData.notes || null,
      }

      if (purchaseOrder) {
        // Update existing PO via API
        const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(poData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update purchase order')
        }

        // Delete old line items via API
        const deleteResponse = await fetch(`/api/po-line-items?po_id=${purchaseOrder.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!deleteResponse.ok) {
          const error = await deleteResponse.json()
          throw new Error(error.error || 'Failed to delete line items')
        }

        // Insert new line items via API
        const lineItemsResponse = await fetch('/api/po-line-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            po_id: purchaseOrder.id,
            line_items: lineItems,
          }),
        })

        if (!lineItemsResponse.ok) {
          const error = await lineItemsResponse.json()
          throw new Error(error.error || 'Failed to create line items')
        }

        // Handle status change: update inventory locations if status changed
        if (previousStatus !== formData.status) {
          await handleStatusChange(purchaseOrder.id, previousStatus, formData.status as POStatus)
        }
      } else {
        // Create new PO via API
        const response = await fetch('/api/purchase-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(poData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create purchase order')
        }

        const { purchase_order: newPO } = await response.json()
        if (!newPO) throw new Error('Failed to create purchase order')

        // Insert line items via API
        const lineItemsResponse = await fetch('/api/po-line-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            po_id: newPO.id,
            line_items: lineItems,
          }),
        })

        if (!lineItemsResponse.ok) {
          const error = await lineItemsResponse.json()
          throw new Error(error.error || 'Failed to create line items')
        }

        // AUTO-CREATE INVENTORY for new PO via API
        const locationType: 'production' | 'storage' = formData.status === 'in_production' ? 'production' : 'storage'
        const statusNote = formData.status === 'in_production' ? 'In Production' : 'Complete'
        const inventoryData = lineItems.map(item => ({
          product_id: item.product_id,
          location_type: locationType,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          unit_shipping_cost: 0,
          po_id: newPO.id,
          notes: `PO ${formData.po_number} ${statusNote}`,
        }))

        const inventoryResponse = await fetch('/api/inventory-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ locations: inventoryData }),
        })

        if (!inventoryResponse.ok) {
          const error = await inventoryResponse.json()
          throw new Error(error.error || 'Failed to create inventory locations')
        }
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsComplete = async () => {
    if (!purchaseOrder) return

    if (!confirm('Mark this purchase order as complete? This will move all inventory from "In Production" to "In Storage".')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Update PO status to in_storage
      const updateData = {
        status: 'in_storage' as const
      } satisfies Database['public']['Tables']['purchase_orders']['Update']



      const { error: updateError } = await supabase
        .from('purchase_orders')
        // @ts-ignore
      .update(updateData)
        .eq('id', purchaseOrder.id)

      if (updateError) throw updateError

      // Move inventory from production to storage
      await handleStatusChange(purchaseOrder.id, formData.status as POStatus, 'in_storage')

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!purchaseOrder) return

    if (!confirm('Are you sure you want to delete this purchase order? This will also delete all line items.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', purchaseOrder.id)

      if (deleteError) throw deleteError

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {purchaseOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                PO Number *
              </label>
              <input
                type="text"
                required
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Supplier *
              </label>
              <select
                required
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Order Date *
              </label>
              <input
                type="date"
                required
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expected Delivery
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as POStatus })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-medium text-gray-900">Line Items</h4>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateLineItem(index, 'product_id', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (SKU: {product.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-700">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_cost}
                      onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-700">Total</label>
                    <input
                      type="text"
                      disabled
                      value={`$${(item.quantity * item.unit_cost).toFixed(2)}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Total PO Value:</span>
                <span className="font-bold text-indigo-600 text-lg">${totals.grandTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Shipping costs will be tracked separately through Shipping Invoices
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-between pt-4">
            <div className="flex gap-2">
              {purchaseOrder && (
                <>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  {purchaseOrder.status === 'in_production' && (
                    <button
                      type="button"
                      onClick={handleMarkAsComplete}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark as Complete
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : purchaseOrder ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
