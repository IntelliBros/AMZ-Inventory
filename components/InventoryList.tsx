'use client'

import { useMemo, memo } from 'react'
import { Database } from '@/types/database.types'

type InventoryLocation = Database['public']['Tables']['inventory_locations']['Row'] & {
  products: {
    id: string
    sku: string
    name: string
    current_cost: number
    current_shipping_cost: number
  } | null
}

type Product = {
  id: string
  sku: string
  name: string
  current_cost: number
  current_shipping_cost: number
}

interface InventoryListProps {
  inventory: InventoryLocation[]
  products: Product[]
}

const locationTypeLabels = {
  fba: '✓ Available (FBA)',
  receiving: '⏳ Receiving',
  en_route: '🚚 In Transit',
  storage: '📦 In Storage',
  production: 'In Production',
}

const locationTypeColors = {
  fba: 'bg-green-500',
  receiving: 'bg-orange-500',
  en_route: 'bg-yellow-500',
  storage: 'bg-purple-500',
  production: 'bg-blue-500',
}

const locationTypeBadgeColors = {
  fba: 'bg-green-100 text-green-800',
  receiving: 'bg-orange-100 text-orange-800',
  en_route: 'bg-yellow-100 text-yellow-800',
  storage: 'bg-purple-100 text-purple-800',
  production: 'bg-blue-100 text-blue-800',
}

interface ProductInventory {
  product_id: string
  product_name: string
  product_sku: string
  asin?: string | null
  fnsku?: string | null
  current_cost: number
  current_shipping_cost: number
  locations: {
    fba: number
    receiving: number
    en_route: number
    storage: number
    production: number
  }
  total_quantity: number
  total_value: number
}

function InventoryList({ inventory, products }: InventoryListProps) {
  // Aggregate inventory by product
  const productInventories = useMemo(() => {
    const aggregated: Record<string, ProductInventory> = {}

    // Process ALL inventory including FBA (warehouse)
    inventory.forEach((item) => {
      if (!item.products) return

      if (!aggregated[item.product_id]) {
        aggregated[item.product_id] = {
          product_id: item.product_id,
          product_name: item.products.name,
          product_sku: item.products.sku,
          current_cost: item.products.current_cost,
          current_shipping_cost: item.products.current_shipping_cost,
          locations: {
            fba: 0,
            receiving: 0,
            en_route: 0,
            storage: 0,
            production: 0,
          },
          total_quantity: 0,
          total_value: 0,
        }
      }

      // Use location_type as-is (now includes fba and receiving separately)
      const locationType = item.location_type as keyof ProductInventory['locations']
      if (locationType in aggregated[item.product_id].locations) {
        aggregated[item.product_id].locations[locationType] += item.quantity
      }
      aggregated[item.product_id].total_quantity += item.quantity
      aggregated[item.product_id].total_value += item.quantity * (item.unit_cost + item.unit_shipping_cost)
    })

    return Object.values(aggregated).sort((a, b) => a.product_name.localeCompare(b.product_name))
  }, [inventory])

  // Calculate totals by location type
  const totalsByLocation = useMemo(() => {
    const totals: Record<string, { quantity: number; value: number }> = {}

    // Initialize all location types
    totals.fba = { quantity: 0, value: 0 }
    totals.receiving = { quantity: 0, value: 0 }
    totals.en_route = { quantity: 0, value: 0 }
    totals.storage = { quantity: 0, value: 0 }
    totals.production = { quantity: 0, value: 0 }

    // Process all inventory with new location types
    inventory.forEach((item) => {
      const locationType = item.location_type as string

      if (!totals[locationType]) {
        totals[locationType] = { quantity: 0, value: 0 }
      }

      const totalUnitCost = item.unit_cost + item.unit_shipping_cost
      totals[locationType].quantity += item.quantity
      totals[locationType].value += item.quantity * totalUnitCost
    })

    return totals
  }, [inventory])

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No inventory records found. Add your first inventory location to get started.</p>
      </div>
    )
  }

  // Calculate "At Amazon" total (FBA + Receiving)
  const atAmazonQty = totalsByLocation.fba.quantity + totalsByLocation.receiving.quantity
  const atAmazonValue = totalsByLocation.fba.value + totalsByLocation.receiving.value

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* At Amazon Card (FBA + Receiving) */}
        <div className="bg-white rounded-lg shadow p-4 border-2 border-[#FF9900]">
          <div>
            <p className="text-sm font-bold text-[#FF9900] uppercase">At Amazon</p>
            <p className="text-2xl font-bold text-gray-900">{atAmazonQty}</p>
            <p className="text-sm text-gray-500 mb-3">${atAmazonValue.toFixed(2)}</p>

            {/* Breakdown */}
            <div className="space-y-1 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">✓ Available (FBA)</span>
                <span className="font-medium text-gray-900">{totalsByLocation.fba.quantity}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-orange-600">⏳ Receiving</span>
                <span className="font-medium text-gray-900">{totalsByLocation.receiving.quantity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Other Location Cards */}
        {['en_route', 'storage', 'production'].map((key) => {
          const label = locationTypeLabels[key as keyof typeof locationTypeLabels]
          const data = totalsByLocation[key as keyof typeof locationTypeLabels] || { quantity: 0, value: 0 }
          return (
            <div key={key} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{data.quantity}</p>
                  <p className="text-sm text-gray-500">${data.value.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Product Cards */}
      <div className="space-y-3">
        {productInventories.map((productInv) => (
          <div key={productInv.product_id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex gap-6">
                {/* Left Section - Product Info & Totals */}
                <div className="flex-shrink-0 w-64 flex flex-col">
                  {/* Product Header - takes up available space */}
                  <div className="flex-1 mb-3">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-3" title={productInv.product_name}>
                      {productInv.product_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">SKU: {productInv.product_sku}</p>
                  </div>

                  {/* Total Inventory - anchored to bottom */}
                  <div className="mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600">Total Units</span>
                      <span className="text-xl font-bold text-gray-900">{productInv.total_quantity}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-xs text-gray-500">Avg. Landed Cost</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${productInv.total_quantity > 0 ? (productInv.total_value / productInv.total_quantity).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-xs text-gray-500">Total Value</span>
                      <span className="text-sm font-medium text-gray-900">${productInv.total_value.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Section - Location Breakdown */}
                <div className="flex-1 border-l border-gray-200 pl-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2.5">Inventory by Location</p>
                  <div className="space-y-2">
                    {/* At Amazon Section */}
                    <div className="bg-orange-50 rounded p-2 -mx-1">
                      <p className="text-xs font-semibold text-[#FF9900] uppercase mb-1.5">At Amazon</p>
                      {['fba', 'receiving'].map((key) => {
                        const label = locationTypeLabels[key as keyof typeof locationTypeLabels]
                        const quantity = productInv.locations[key as keyof typeof productInv.locations]
                        const percentage = productInv.total_quantity > 0
                          ? (quantity / productInv.total_quantity) * 100
                          : 0

                        return (
                          <div key={key} className="mb-1.5">
                            <div className="flex justify-between items-center mb-0.5">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full ${locationTypeColors[key as keyof typeof locationTypeColors]} mr-2`}></div>
                                <span className="text-xs text-gray-700">{label}</span>
                              </div>
                              <span className="text-xs font-medium text-gray-900">{quantity}</span>
                            </div>
                            {quantity > 0 && (
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${locationTypeColors[key as keyof typeof locationTypeColors]}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Other Locations */}
                    {['en_route', 'storage', 'production'].map((key) => {
                      const label = locationTypeLabels[key as keyof typeof locationTypeLabels]
                      const quantity = productInv.locations[key as keyof typeof productInv.locations]
                      const percentage = productInv.total_quantity > 0
                        ? (quantity / productInv.total_quantity) * 100
                        : 0

                      return (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-0.5">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ${locationTypeColors[key as keyof typeof locationTypeColors]} mr-2`}></div>
                              <span className="text-sm text-gray-700">{label}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{quantity}</span>
                          </div>
                          {quantity > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${locationTypeColors[key as keyof typeof locationTypeColors]}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default memo(InventoryList)
