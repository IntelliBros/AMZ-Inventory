'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type ShippingInvoice = Database['public']['Tables']['shipping_invoices']['Row'] & {
  shipping_line_items?: Array<{
    id: string
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

type ShipmentStatus = 'pending' | 'in_transit' | 'delivered'

interface Product {
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

interface StorageInventory {
  product_id: string
  product_name: string
  product_sku: string
  product_asin: string | null
  total_available: number
}

interface LineItem {
  product_id: string
  quantity: number
  available_quantity: number
  unit_shipping_cost: number
  chargeable_weight: number
}

interface ShippingInvoiceModalProps {
  shippingInvoice: ShippingInvoice | null
  products: Product[]
  onClose: () => void
}

const shipmentStatuses: { value: ShipmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
]

export default function ShippingInvoiceModal({ shippingInvoice, products, onClose }: ShippingInvoiceModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    invoice_number: shippingInvoice?.invoice_number || '',
    shipping_date: shippingInvoice?.shipping_date || new Date().toISOString().split('T')[0],
    carrier: shippingInvoice?.carrier || '',
    tracking_number: shippingInvoice?.tracking_number || '',
    status: (shippingInvoice?.status as ShipmentStatus) || 'pending' as ShipmentStatus,
    notes: shippingInvoice?.notes || '',
    total_invoice_cost: shippingInvoice?.total_shipping_cost?.toString() || '0',
  })

  const [previousStatus, setPreviousStatus] = useState<ShipmentStatus | null>(
    (shippingInvoice?.status as ShipmentStatus) || null
  )

  const [storageInventory, setStorageInventory] = useState<StorageInventory[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Load existing line items when editing
  useEffect(() => {
    if (shippingInvoice && shippingInvoice.shipping_line_items) {
      const existingItems: LineItem[] = shippingInvoice.shipping_line_items.map(item => {
        const product = products.find(p => p.id === item.product_id)
        const chargeableWeight = product ? calculateChargeableWeight(product) : 0

        return {
          product_id: item.product_id,
          quantity: item.quantity,
          available_quantity: item.quantity, // When editing, current quantity is "available"
          unit_shipping_cost: item.unit_shipping_cost,
          chargeable_weight: chargeableWeight,
        }
      })
      setLineItems(existingItems)
    }
  }, [shippingInvoice])

  // Fetch available storage inventory
  useEffect(() => {
    const fetchStorageInventory = async () => {
      setLoadingInventory(true)
      try {
        const response = await fetch('/api/inventory-locations?location_type=storage', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch storage inventory')
        }

        const { locations: data } = await response.json()

        // Aggregate by product
        const aggregated: Record<string, StorageInventory> = {}

        data?.forEach((item: any) => {
          if (!aggregated[item.product_id]) {
            aggregated[item.product_id] = {
              product_id: item.product_id,
              product_name: item.products?.name || 'Unknown',
              product_sku: item.products?.sku || 'N/A',
              product_asin: item.products?.asin || null,
              total_available: 0,
            }
          }
          aggregated[item.product_id].total_available += item.quantity
        })

        setStorageInventory(Object.values(aggregated).filter(inv => inv.total_available > 0))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoadingInventory(false)
      }
    }

    fetchStorageInventory()
  }, [supabase])

  const calculateChargeableWeight = (product: Product): number => {
    if (!product.carton_length_cm || !product.carton_width_cm || !product.carton_height_cm || !product.carton_weight_kg) {
      return product.carton_weight_kg || 0
    }

    const volumetricWeight = (product.carton_length_cm * product.carton_width_cm * product.carton_height_cm) / 6000
    const cartonChargeableWeight = Math.max(product.carton_weight_kg, volumetricWeight)

    // Divide by units per carton to get per-unit chargeable weight
    const unitsPerCarton = product.units_per_carton || 1
    return cartonChargeableWeight / unitsPerCarton
  }

  const addLineItem = () => {
    if (storageInventory.length === 0) {
      setError('No inventory available in storage')
      return
    }

    setLineItems([...lineItems, {
      product_id: '',
      quantity: 0,
      available_quantity: 0,
      unit_shipping_cost: 0,
      chargeable_weight: 0,
    }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]

    if (field === 'product_id') {
      const productId = value as string
      updated[index].product_id = productId

      // Set available quantity from storage
      const storage = storageInventory.find(s => s.product_id === productId)
      updated[index].available_quantity = storage?.total_available || 0

      // Calculate chargeable weight per unit and unit shipping cost
      const product = products.find(p => p.id === productId)
      if (product) {
        const chargeableWeight = calculateChargeableWeight(product)
        updated[index].chargeable_weight = chargeableWeight
        // Unit shipping cost = chargeable weight * cost per kg
        updated[index].unit_shipping_cost = chargeableWeight * (product.current_shipping_cost || 0)
      }

      // Set quantity to available if not set
      if (!updated[index].quantity) {
        updated[index].quantity = updated[index].available_quantity
      }
    } else if (field === 'quantity') {
      const qty = value as number
      if (qty > updated[index].available_quantity) {
        setError(`Quantity cannot exceed available quantity (${updated[index].available_quantity})`)
        return
      }
      updated[index].quantity = qty
      setError(null)
    } else {
      updated[index][field] = value as any
    }

    setLineItems(updated)
    recalculateUnitCosts(updated)
  }

  const recalculateUnitCosts = (items: LineItem[]) => {
    const totalInvoiceCost = parseFloat(formData.total_invoice_cost) || 0

    // Calculate total chargeable weight for the shipment
    const totalChargeableWeight = items.reduce((sum, item) => {
      return sum + (item.chargeable_weight * item.quantity)
    }, 0)

    if (totalChargeableWeight === 0) return items

    // Distribute cost based on percentage of chargeable weight
    items.forEach(item => {
      const itemTotalWeight = item.chargeable_weight * item.quantity
      const weightPercentage = itemTotalWeight / totalChargeableWeight
      const itemTotalCost = totalInvoiceCost * weightPercentage
      item.unit_shipping_cost = item.quantity > 0 ? itemTotalCost / item.quantity : 0
    })

    return items
  }

  // Recalculate when total invoice cost changes
  useEffect(() => {
    if (lineItems.length > 0) {
      const updated = recalculateUnitCosts([...lineItems])
      setLineItems(updated)
    }
  }, [formData.total_invoice_cost])

  const calculateShippingTotal = () => {
    return parseFloat(formData.total_invoice_cost) || 0
  }

  const getTotalChargeableWeight = () => {
    return lineItems.reduce((sum, item) => sum + (item.chargeable_weight * item.quantity), 0)
  }

  // Handle status change: convert inventory via API
  const handleStatusChange = async (invoiceId: string, newStatus: ShipmentStatus) => {
    const response = await fetch(`/api/shipping-invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update shipping invoice')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate line items
      if (lineItems.length === 0 || lineItems.some(item => !item.product_id || item.quantity <= 0)) {
        throw new Error('Please add at least one valid product with quantity')
      }

      const shippingTotal = calculateShippingTotal()

      const invoiceData = {
        invoice_number: formData.invoice_number,
        shipping_date: formData.shipping_date,
        carrier: formData.carrier,
        tracking_number: formData.tracking_number || null,
        status: formData.status,
        total_shipping_cost: shippingTotal,
        notes: formData.notes || null,
      }

      if (shippingInvoice) {
        // Update existing invoice via API
        await handleStatusChange(shippingInvoice.id, formData.status)
      } else {
        // Create new shipment via API
        const response = await fetch('/api/shipping-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...invoiceData,
            line_items: lineItems.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              chargeable_weight: item.chargeable_weight,
              unit_shipping_cost: item.unit_shipping_cost,
            })),
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create shipping invoice')
        }

        // Skip the old direct Supabase code - commented out for reference
        /*
        for (const item of lineItems) {
          // Find storage inventory for this product (FIFO)
          // @ts-ignore
          const { data: storageInventories } = await supabase
            .from('inventory_locations')
            .select('*')
            .eq('product_id', item.product_id)
            .eq('location_type', 'storage')
            .order('created_at', { ascending: true })

          if (storageInventories && storageInventories.length > 0) {
            let remainingToShip = item.quantity

            // Reduce storage inventory (FIFO - first in, first out)
            // @ts-ignore
            for (const storage of storageInventories) {
              if (remainingToShip <= 0) break
              // @ts-ignore
              if (storage.quantity <= remainingToShip) {
                // Fully consume this storage record
                await supabase
                  .from('inventory_locations')
                  .delete()
                  // @ts-ignore
                  .eq('id', storage.id)
                // @ts-ignore
                remainingToShip -= storage.quantity
              } else {
                // Partially consume this storage record (rest stays in storage)
                await supabase
                  .from('inventory_locations')
                  // @ts-ignore
                  .update({ quantity: storage.quantity - remainingToShip })
                  // @ts-ignore
                  .eq('id', storage.id)

                remainingToShip = 0
              }
            }
          }

          // Create en_route inventory for the shipped quantity
          const { error: inventoryError } = await supabase
            .from('inventory_locations')
            // @ts-ignore
            .insert({
              product_id: item.product_id,
              location_type: 'en_route',
              quantity: item.quantity,
              // @ts-ignore
              unit_cost: storageInventories?.[0]?.unit_cost || 0,
              unit_shipping_cost: item.unit_shipping_cost,
              po_id: null, // No longer tracking PO link
              notes: `Shipment ${formData.invoice_number} Created`,
            })

          if (inventoryError) throw inventoryError
        }
        */
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!shippingInvoice) return

    if (!confirm('Are you sure you want to delete this shipping invoice?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shipping-invoices/${shippingInvoice.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete shipping invoice')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const shippingTotal = calculateShippingTotal()
  const getProductDisplay = (productId: string) => {
    const storage = storageInventory.find(s => s.product_id === productId)
    return storage ? `${storage.product_name} (SKU: ${storage.product_sku})` : 'Unknown'
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {shippingInvoice ? 'Edit Shipping Invoice' : 'Create New Shipment'}
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
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ShipmentStatus })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {shipmentStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Shipping Date *
              </label>
              <input
                type="date"
                required
                value={formData.shipping_date}
                onChange={(e) => setFormData({ ...formData, shipping_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Carrier *
              </label>
              <input
                type="text"
                required
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., FedEx, DHL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tracking Number
              </label>
              <input
                type="text"
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Invoice Cost *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.total_invoice_cost}
                onChange={(e) => setFormData({ ...formData, total_invoice_cost: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Available Storage Inventory Info */}
          {!shippingInvoice && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Available Inventory in Storage</h4>
              {loadingInventory ? (
                <p className="text-sm text-gray-500">Loading inventory...</p>
              ) : storageInventory.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    No inventory available in storage. Complete a Purchase Order first to add inventory to storage.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>{storageInventory.length} product(s)</strong> available for shipment:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {storageInventory.slice(0, 5).map((inv) => (
                      <li key={inv.product_id}>
                        • {inv.product_asin ? `${inv.product_asin} | ` : ''}{inv.product_sku} | {inv.product_name}: <strong>{inv.total_available} units</strong>
                      </li>
                    ))}
                    {storageInventory.length > 5 && (
                      <li>... and {storageInventory.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-medium text-gray-900">Shipment Items</h4>
              {!shippingInvoice && (
                <button
                  type="button"
                  onClick={addLineItem}
                  disabled={storageInventory.length === 0}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Item
                </button>
              )}
            </div>

            {lineItems.length > 0 ? (
              <div className="space-y-2">
                {lineItems.map((item, index) => {
                  // For existing shipments, get product info directly
                  const productInfo = shippingInvoice
                    ? shippingInvoice.shipping_line_items?.find(li => li.product_id === item.product_id)?.products
                    : null

                  const storageInfo = storageInventory.find(s => s.product_id === item.product_id)

                  const productDisplay = productInfo
                    ? `${productInfo.name} (${productInfo.sku})`
                    : storageInfo
                      ? `${storageInfo.product_name} (${storageInfo.product_sku})`
                      : 'Unknown Product'

                  return (
                    <div key={index} className="flex gap-2 items-end bg-gray-50 p-2 rounded">
                      {shippingInvoice ? (
                        // Read-only view for existing shipments
                        <>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700">Product</label>
                            <input
                              type="text"
                              disabled
                              value={productDisplay}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700 text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-gray-700">Quantity</label>
                            <input
                              type="text"
                              disabled
                              value={item.quantity}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700 text-sm"
                            />
                          </div>
                        </>
                      ) : (
                        // Editable view for new shipments
                        <>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700">Product *</label>
                            <select
                              value={item.product_id}
                              onChange={(e) => updateLineItem(index, 'product_id', e.target.value)}
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            >
                              <option value="">Select product</option>
                              {storageInventory.map((inv) => (
                                <option key={inv.product_id} value={inv.product_id}>
                                  {inv.product_asin ? `${inv.product_asin} | ` : ''}{inv.product_sku} | {inv.product_name} - {inv.total_available} available
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-gray-700">Available</label>
                            <input
                              type="text"
                              disabled
                              value={item.available_quantity}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-gray-700">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              max={item.available_quantity}
                              value={item.quantity || ''}
                              onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              required
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                          </div>
                        </>
                      )}
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-700">Chg. Wt/Unit</label>
                        <input
                          type="text"
                          disabled
                          value={`${item.chargeable_weight.toFixed(2)} kg`}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 text-sm"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-700">Unit Cost</label>
                        <input
                          type="text"
                          disabled
                          value={`$${item.unit_shipping_cost.toFixed(2)}`}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 text-sm"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-700">Total</label>
                        <input
                          type="text"
                          disabled
                          value={`$${(item.quantity * item.unit_shipping_cost).toFixed(2)}`}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 text-sm"
                        />
                      </div>
                      {!shippingInvoice && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )
                })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  {shippingInvoice ? 'No line items found' : 'Click "Add Item" to add products to this shipment'}
                </p>
              )}
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Chargeable Weight:</span>
                <span className="font-medium text-gray-900">{getTotalChargeableWeight().toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Shipping Cost:</span>
                <span className="font-bold text-indigo-600 text-lg">${shippingTotal.toFixed(2)}</span>
              </div>
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {shippingInvoice && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
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
                disabled={loading || (lineItems.length === 0 && !shippingInvoice)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : shippingInvoice ? 'Update' : 'Create Shipment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
