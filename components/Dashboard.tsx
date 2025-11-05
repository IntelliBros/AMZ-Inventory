'use client'

import { Database } from '@/types/database.types'
import { useMemo, memo } from 'react'

type InventoryLocation = Database['public']['Tables']['inventory_locations']['Row'] & {
  products: {
    id: string
    sku: string
    name: string
    current_cost: number
    current_shipping_cost: number
  } | null
}

type Product = Database['public']['Tables']['products']['Row']

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  po_line_items: Array<{
    quantity: number
    unit_cost: number
  }>
}

type SalesRecord = Database['public']['Tables']['sales_records']['Row']

interface DashboardProps {
  inventory: InventoryLocation[]
  products: Product[]
  purchaseOrders: PurchaseOrder[]
  salesRecords: SalesRecord[]
}

function Dashboard({ inventory, products, purchaseOrders, salesRecords }: DashboardProps) {
  const stats = useMemo(() => {
    // Calculate inventory values by location type (now includes fba + receiving)
    const locationStats = {
      amazon: { quantity: 0, value: 0 }, // Combined FBA + Receiving
      en_route: { quantity: 0, value: 0 },
      storage: { quantity: 0, value: 0 },
      production: { quantity: 0, value: 0 },
    }

    // Process all inventory with new location types
    inventory.forEach((item) => {
      const totalUnitCost = item.unit_cost + item.unit_shipping_cost
      const itemValue = item.quantity * totalUnitCost

      const locationType = item.location_type as string

      // Group fba and receiving as "amazon"
      if (locationType === 'fba' || locationType === 'receiving') {
        locationStats.amazon.quantity += item.quantity
        locationStats.amazon.value += itemValue
      } else if (locationType in locationStats) {
        locationStats[locationType as keyof typeof locationStats].quantity += item.quantity
        locationStats[locationType as keyof typeof locationStats].value += itemValue
      }
    })

    // Calculate totals
    const totalInventory = Object.values(locationStats).reduce(
      (sum, stat) => sum + stat.quantity,
      0
    )

    const totalValue = Object.values(locationStats).reduce(
      (sum, stat) => sum + stat.value,
      0
    )

    // Purchase order stats (simplified statuses)
    const activePOs = purchaseOrders.filter(
      (po) => po.status === 'in_production'
    ).length

    const completedPOs = purchaseOrders.filter((po) => po.status === 'in_storage' || po.status === 'complete').length

    // Product stats
    const totalProducts = products.length

    const avgProductCost =
      totalProducts > 0
        ? products.reduce((sum, p) => sum + p.current_cost, 0) / totalProducts
        : 0

    // Sales stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSales = salesRecords.filter(record => {
      const endDate = new Date(record.end_date)
      return endDate >= thirtyDaysAgo
    })

    const totalUnitsSold = recentSales.reduce((sum, record) => sum + record.units_sold, 0)
    const avgDailySales = totalUnitsSold / 30

    return {
      locationStats,
      totalInventory,
      totalValue,
      activePOs,
      completedPOs,
      totalProducts,
      avgProductCost,
      totalUnitsSold,
      avgDailySales,
    }
  }, [inventory, products, purchaseOrders, salesRecords])

  const locationLabels = {
    amazon: 'At Amazon (FBA + Receiving)',
    en_route: 'En Route to Amazon',
    storage: 'In Storage',
    production: 'In Production',
  }

  const locationColors = {
    amazon: 'bg-[#FF9900]',
    en_route: 'bg-yellow-500',
    storage: 'bg-purple-500',
    production: 'bg-blue-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Inventory Dashboard</h2>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${stats.totalValue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stats.totalInventory} units</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Purchase Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activePOs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Unit Cost</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${stats.totalInventory > 0 ? (stats.totalValue / stats.totalInventory).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-gray-500 mt-1">Including shipping</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Summary */}
      {salesRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Summary (Last 30 Days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Units Sold</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalUnitsSold}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Average Daily Sales</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.avgDailySales.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">units/day</p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory by Location */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Inventory by Location</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(locationLabels).map(([key, label]) => {
              const stat = stats.locationStats[key as keyof typeof locationLabels]
              const percentage = stats.totalValue > 0 ? (stat.value / stats.totalValue) * 100 : 0

              return (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${locationColors[key as keyof typeof locationColors]} mr-2`}></div>
                      <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                    </div>
                    <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-gray-900">${stat.value.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{stat.quantity} units</p>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${locationColors[key as keyof typeof locationColors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}

export default memo(Dashboard)
