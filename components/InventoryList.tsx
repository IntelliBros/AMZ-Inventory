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

type WarehouseSnapshot = {
  product_id: string
  quantity: number
  snapshot_date: string
  products: {
    id: string
    sku: string
    name: string
    current_cost: number
    current_shipping_cost: number
  } | null
}

interface InventoryListProps {
  inventory: InventoryLocation[]
  products: Product[]
  warehouseSnapshots: WarehouseSnapshot[]
}

const locationTypeLabels = {
  warehouse: 'Amazon Warehouse',
  en_route: 'En Route',
  storage: 'Storage',
  production: 'In Production',
}

const locationTypeColors = {
  warehouse: 'bg-blue-500',
  en_route: 'bg-yellow-500',
  storage: 'bg-purple-500',
  production: 'bg-green-500',
}

const locationTypeBadgeColors = {
  warehouse: 'bg-blue-100 text-blue-800',
  en_route: 'bg-yellow-100 text-yellow-800',
  storage: 'bg-purple-100 text-purple-800',
  production: 'bg-green-100 text-green-800',
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
    warehouse: number
    en_route: number
    storage: number
    production: number
  }
  total_quantity: number
  total_value: number
}

function InventoryList({ inventory, products, warehouseSnapshots }: InventoryListProps) {
  // Aggregate inventory by product
  const productInventories = useMemo(() => {
    const aggregated: Record<string, ProductInventory> = {}

    // Process regular inventory (skip warehouse - we'll get that from snapshots)
    inventory.forEach((item) => {
      if (!item.products || item.location_type === 'warehouse') return

      if (!aggregated[item.product_id]) {
        aggregated[item.product_id] = {
          product_id: item.product_id,
          product_name: item.products.name,
          product_sku: item.products.sku,
          current_cost: item.products.current_cost,
          current_shipping_cost: item.products.current_shipping_cost,
          locations: {
            warehouse: 0,
            en_route: 0,
            storage: 0,
            production: 0,
          },
          total_quantity: 0,
          total_value: 0,
        }
      }

      aggregated[item.product_id].locations[item.location_type] += item.quantity
      aggregated[item.product_id].total_quantity += item.quantity
      aggregated[item.product_id].total_value += item.quantity * (item.unit_cost + item.unit_shipping_cost)
    })

    // Get latest snapshot per product for warehouse inventory
    const latestSnapshots = new Map<string, WarehouseSnapshot>()
    warehouseSnapshots.forEach(snapshot => {
      const existing = latestSnapshots.get(snapshot.product_id)
      if (!existing || new Date(snapshot.snapshot_date) > new Date(existing.snapshot_date)) {
        latestSnapshots.set(snapshot.product_id, snapshot)
      }
    })

    // Add warehouse inventory from latest snapshots
    latestSnapshots.forEach(snapshot => {
      if (!snapshot.products) return

      if (!aggregated[snapshot.product_id]) {
        aggregated[snapshot.product_id] = {
          product_id: snapshot.product_id,
          product_name: snapshot.products.name,
          product_sku: snapshot.products.sku,
          current_cost: snapshot.products.current_cost,
          current_shipping_cost: snapshot.products.current_shipping_cost,
          locations: {
            warehouse: 0,
            en_route: 0,
            storage: 0,
            production: 0,
          },
          total_quantity: 0,
          total_value: 0,
        }
      }

      const totalUnitCost = snapshot.products.current_cost + snapshot.products.current_shipping_cost
      aggregated[snapshot.product_id].locations.warehouse += snapshot.quantity
      aggregated[snapshot.product_id].total_quantity += snapshot.quantity
      aggregated[snapshot.product_id].total_value += snapshot.quantity * totalUnitCost
    })

    return Object.values(aggregated).sort((a, b) => a.product_name.localeCompare(b.product_name))
  }, [inventory, warehouseSnapshots])

  // Calculate totals by location type
  const totalsByLocation = useMemo(() => {
    const totals: Record<string, { quantity: number; value: number }> = {}

    // Process regular inventory (skip warehouse - we'll get that from snapshots)
    inventory.forEach((item) => {
      if (item.location_type === 'warehouse') return

      if (!totals[item.location_type]) {
        totals[item.location_type] = { quantity: 0, value: 0 }
      }
      const totalUnitCost = item.unit_cost + item.unit_shipping_cost
      totals[item.location_type].quantity += item.quantity
      totals[item.location_type].value += item.quantity * totalUnitCost
    })

    // Get latest snapshot per product for warehouse inventory
    const latestSnapshots = new Map<string, WarehouseSnapshot>()
    warehouseSnapshots.forEach(snapshot => {
      const existing = latestSnapshots.get(snapshot.product_id)
      if (!existing || new Date(snapshot.snapshot_date) > new Date(existing.snapshot_date)) {
        latestSnapshots.set(snapshot.product_id, snapshot)
      }
    })

    // Add warehouse totals from latest snapshots
    totals.warehouse = { quantity: 0, value: 0 }
    latestSnapshots.forEach(snapshot => {
      if (!snapshot.products) return
      const totalUnitCost = snapshot.products.current_cost + snapshot.products.current_shipping_cost
      totals.warehouse.quantity += snapshot.quantity
      totals.warehouse.value += snapshot.quantity * totalUnitCost
    })

    return totals
  }, [inventory, warehouseSnapshots])

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No inventory records found. Add your first inventory location to get started.</p>
      </div>
    )
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(locationTypeLabels).map(([key, label]) => {
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
                    {Object.entries(locationTypeLabels).map(([key, label]) => {
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
