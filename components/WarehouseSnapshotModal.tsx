'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type WarehouseSnapshot = Database['public']['Tables']['warehouse_snapshots']['Row']

interface Product {
  id: string
  sku: string
  name: string
}

interface WarehouseSnapshotModalProps {
  snapshot: WarehouseSnapshot | null
  products: Product[]
  onClose: () => void
}

interface ProductSnapshot {
  product_id: string
  quantity: string
}

export default function WarehouseSnapshotModal({ snapshot, products, onClose }: WarehouseSnapshotModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBulkMode, setIsBulkMode] = useState(!snapshot) // Default to bulk mode for new snapshots

  const [formData, setFormData] = useState({
    product_id: snapshot?.product_id || '',
    snapshot_date: snapshot?.snapshot_date || new Date().toISOString().split('T')[0],
    quantity: snapshot?.quantity?.toString() || '0',
    notes: snapshot?.notes || '',
  })

  // Bulk mode: initialize with all products
  const [productSnapshots, setProductSnapshots] = useState<ProductSnapshot[]>(
    products.map(p => ({
      product_id: p.id,
      quantity: '0'
    }))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isBulkMode && !snapshot) {
        // Bulk mode: create snapshots for all products with quantity >= 0
        const snapshotsToCreate = productSnapshots.filter(ps => {
          const qty = parseInt(ps.quantity)
          return !isNaN(qty) && qty >= 0
        })

        if (snapshotsToCreate.length === 0) {
          throw new Error('Please enter quantities for at least one product')
        }

        // Create all snapshots via API
        const snapshotDataArray = snapshotsToCreate.map(ps => ({
          product_id: ps.product_id,
          snapshot_date: formData.snapshot_date,
          quantity: parseInt(ps.quantity),
          notes: formData.notes || null,
        }))

        const response = await fetch('/api/warehouse-snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ snapshots: snapshotDataArray }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create warehouse snapshots')
        }
      } else {
        // Single mode
        const quantity = parseInt(formData.quantity)
        if (isNaN(quantity) || quantity < 0) {
          throw new Error('Please enter a valid quantity')
        }

        const snapshotData = {
          product_id: formData.product_id,
          snapshot_date: formData.snapshot_date,
          quantity,
          notes: formData.notes || null,
        }

        if (snapshot) {
          // Update existing snapshot via API
          const response = await fetch(`/api/warehouse-snapshots/${snapshot.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(snapshotData),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to update warehouse snapshot')
          }
        } else {
          // Create new snapshot via API (single)
          const response = await fetch('/api/warehouse-snapshots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ snapshots: [snapshotData] }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to create warehouse snapshot')
          }
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

  const updateProductQuantity = (productId: string, quantity: string) => {
    setProductSnapshots(prev =>
      prev.map(ps =>
        ps.product_id === productId ? { ...ps, quantity } : ps
      )
    )
  }

  const handleDelete = async () => {
    if (!snapshot) return

    if (!confirm('Are you sure you want to delete this snapshot? This may affect sales calculations.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/warehouse-snapshots/${snapshot.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete warehouse snapshot')
      }

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
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {snapshot ? 'Edit Warehouse Snapshot' : 'New Warehouse Snapshot'}
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

        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Enter the actual inventory count at Amazon's warehouse.
            The system will automatically calculate units sold by using: (previous snapshot + delivered units) - current snapshot.
            Delivered shipments are tracked separately and not added to the warehouse inventory count.
          </p>
        </div>

        {/* Mode toggle for new snapshots */}
        {!snapshot && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setIsBulkMode(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isBulkMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Bulk Entry (All Products)
            </button>
            <button
              type="button"
              onClick={() => setIsBulkMode(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                !isBulkMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Single Product
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Snapshot Date *
              </label>
              <input
                type="date"
                required
                value={formData.snapshot_date}
                onChange={(e) => setFormData({ ...formData, snapshot_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {!isBulkMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product *
                </label>
                <select
                  required={!isBulkMode}
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  disabled={!!snapshot}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isBulkMode && !snapshot ? (
            // Bulk mode: show all products in a grid
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Enter quantities for each product:</h4>
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const productSnapshot = productSnapshots.find(ps => ps.product_id === product.id)
                  return (
                    <div key={product.id} className="flex items-center gap-2 border rounded p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={productSnapshot?.quantity || '0'}
                        onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                        className="w-20 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Single mode: show single quantity field
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity at Warehouse *
              </label>
              <input
                type="number"
                required={!isBulkMode}
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Actual count at warehouse"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes {isBulkMode && '(applies to all snapshots)'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Any observations or notes about this count"
            />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div>
              {snapshot && (
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
                {loading ? 'Saving...' : snapshot ? 'Update Snapshot' : isBulkMode ? `Create ${productSnapshots.filter(ps => parseInt(ps.quantity) > 0).length} Snapshots` : 'Create Snapshot'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
