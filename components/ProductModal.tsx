'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    asin: product?.asin || '',
    fnsku: product?.fnsku || '',
    current_cost: product?.current_cost?.toString() || '0',
    carton_length_cm: product?.carton_length_cm?.toString() || '',
    carton_width_cm: product?.carton_width_cm?.toString() || '',
    carton_height_cm: product?.carton_height_cm?.toString() || '',
    carton_weight_kg: product?.carton_weight_kg?.toString() || '',
    units_per_carton: product?.units_per_carton?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const productData = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || null,
        asin: formData.asin || null,
        fnsku: formData.fnsku || null,
        current_cost: parseFloat(formData.current_cost),
        current_shipping_cost: 0,
        carton_length_cm: formData.carton_length_cm ? parseFloat(formData.carton_length_cm) : null,
        carton_width_cm: formData.carton_width_cm ? parseFloat(formData.carton_width_cm) : null,
        carton_height_cm: formData.carton_height_cm ? parseFloat(formData.carton_height_cm) : null,
        carton_weight_kg: formData.carton_weight_kg ? parseFloat(formData.carton_weight_kg) : null,
        units_per_carton: formData.units_per_carton ? parseInt(formData.units_per_carton) : null,
      }

      if (product) {
        // Update existing product via API
        const response = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(productData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update product')
        }
      } else {
        // Create new product via API
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(productData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create product')
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

  const handleDelete = async () => {
    if (!product) return

    if (!confirm('Are you sure you want to delete this product? This will also delete all associated inventory records.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product')
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
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
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
                SKU *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ASIN
              </label>
              <input
                type="text"
                value={formData.asin}
                onChange={(e) => setFormData({ ...formData, asin: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                FNSKU
              </label>
              <input
                type="text"
                value={formData.fnsku}
                onChange={(e) => setFormData({ ...formData, fnsku: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Unit Cost *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.current_cost}
              onChange={(e) => setFormData({ ...formData, current_cost: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Shipping Carton Layout */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Shipping Carton Layout</h4>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.carton_length_cm}
                  onChange={(e) => setFormData({ ...formData, carton_length_cm: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Width (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.carton_width_cm}
                  onChange={(e) => setFormData({ ...formData, carton_width_cm: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.carton_height_cm}
                  onChange={(e) => setFormData({ ...formData, carton_height_cm: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gross Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.carton_weight_kg}
                  onChange={(e) => setFormData({ ...formData, carton_weight_kg: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Units Per Carton
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.units_per_carton}
                  onChange={(e) => setFormData({ ...formData, units_per_carton: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="1"
                />
              </div>
            </div>

            {/* Display calculated metrics */}
            {formData.carton_length_cm && formData.carton_width_cm && formData.carton_height_cm && (
              <div className="mt-2 text-xs text-gray-500">
                <div className="mb-1">
                  <span className="font-medium">Carton:</span>
                  {' '}
                  <span>
                    Volume: {(parseFloat(formData.carton_length_cm) * parseFloat(formData.carton_width_cm) * parseFloat(formData.carton_height_cm) / 1000000).toFixed(4)} m³
                  </span>
                  {' | '}
                  <span>
                    Volumetric Weight: {(parseFloat(formData.carton_length_cm) * parseFloat(formData.carton_width_cm) * parseFloat(formData.carton_height_cm) / 6000).toFixed(2)} kg
                  </span>
                  {formData.carton_weight_kg && (
                    <>
                      {' | '}
                      <span className="font-medium text-gray-700">
                        Chargeable Weight: {Math.max(
                          parseFloat(formData.carton_weight_kg),
                          parseFloat(formData.carton_length_cm) * parseFloat(formData.carton_width_cm) * parseFloat(formData.carton_height_cm) / 6000
                        ).toFixed(2)} kg
                      </span>
                    </>
                  )}
                </div>
                {formData.units_per_carton && formData.carton_weight_kg && (
                  <div>
                    <span className="font-medium text-indigo-600">Per Unit:</span>
                    {' '}
                    <span className="font-medium text-indigo-600">
                      Chargeable Weight: {(Math.max(
                        parseFloat(formData.carton_weight_kg),
                        parseFloat(formData.carton_length_cm) * parseFloat(formData.carton_width_cm) * parseFloat(formData.carton_height_cm) / 6000
                      ) / parseInt(formData.units_per_carton)).toFixed(4)} kg/unit
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {product && (
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
                {loading ? 'Saving...' : product ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
