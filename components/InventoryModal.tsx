'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type InventoryLocation = Database['public']['Tables']['inventory_locations']['Row']
type LocationType = Database['public']['Tables']['inventory_locations']['Row']['location_type']

interface Product {
  id: string
  sku: string
  name: string
  current_cost: number
  current_shipping_cost: number
}

interface InventoryModalProps {
  inventory: (InventoryLocation & { products: Product | null }) | null
  products: Product[]
  onClose: () => void
}

const locationTypes: { value: LocationType; label: string }[] = [
  { value: 'warehouse', label: 'Amazon Warehouse' },
  { value: 'en_route', label: 'En Route' },
  { value: 'storage', label: 'Storage' },
  { value: 'production', label: 'In Production' },
]

export default function InventoryModal({ inventory, products, onClose }: InventoryModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    product_id: inventory?.product_id || '',
    location_type: inventory?.location_type || 'warehouse' as LocationType,
    quantity: inventory?.quantity?.toString() || '0',
    unit_cost: inventory?.unit_cost?.toString() || '0',
    unit_shipping_cost: inventory?.unit_shipping_cost?.toString() || '0',
    notes: inventory?.notes || '',
  })

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product && !inventory) {
      // Pre-fill with current costs for new inventory
      setFormData({
        ...formData,
        product_id: productId,
        unit_cost: product.current_cost.toString(),
        unit_shipping_cost: product.current_shipping_cost.toString(),
      })
    } else {
      setFormData({ ...formData, product_id: productId })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (inventory) {
        // Update existing inventory

        const { error: updateError } = await supabase
          .from('inventory_locations')
          // @ts-ignore
          .update({
            product_id: formData.product_id,
            location_type: formData.location_type,
            quantity: parseInt(formData.quantity),
            unit_cost: parseFloat(formData.unit_cost),
            unit_shipping_cost: parseFloat(formData.unit_shipping_cost),
            notes: formData.notes || null,
          })
          .eq('id', inventory.id)

        if (updateError) throw updateError
      } else {
        // Create new inventory

        const { error: insertError} = await supabase
          .from('inventory_locations')
          // @ts-ignore
          .insert([{
            product_id: formData.product_id,
            location_type: formData.location_type,
            quantity: parseInt(formData.quantity),
            unit_cost: parseFloat(formData.unit_cost),
            unit_shipping_cost: parseFloat(formData.unit_shipping_cost),
            notes: formData.notes || null,
          }])

        if (insertError) throw insertError
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
    if (!inventory) return

    if (!confirm('Are you sure you want to delete this inventory record?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('inventory_locations')
        .delete()
        .eq('id', inventory.id)

      if (deleteError) throw deleteError

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {inventory ? 'Edit Inventory' : 'Add New Inventory'}
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
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product *
            </label>
            <select
              required
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (SKU: {product.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Location Type *
            </label>
            <select
              required
              value={formData.location_type}
              onChange={(e) => setFormData({ ...formData, location_type: e.target.value as LocationType })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {locationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quantity *
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unit Cost *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unit Shipping Cost *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unit_shipping_cost}
                onChange={(e) => setFormData({ ...formData, unit_shipping_cost: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
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
            <div>
              {inventory && (
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
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : inventory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
