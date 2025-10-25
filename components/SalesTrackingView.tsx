'use client'

import { useState, useMemo } from 'react'
import { Database } from '@/types/database.types'

type SalesRecord = Database['public']['Tables']['sales_records']['Row'] & {
  products: {
    id: string
    sku: string
    name: string
    current_cost: number
  } | null
}

interface Product {
  id: string
  sku: string
  name: string
}

interface SalesTrackingViewProps {
  salesRecords: SalesRecord[]
  products: Product[]
}

export default function SalesTrackingView({ salesRecords, products }: SalesTrackingViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('all')

  // Filter sales records by product
  const filteredRecords = useMemo(() => {
    if (selectedProduct === 'all') return salesRecords
    return salesRecords.filter(record => record.product_id === selectedProduct)
  }, [salesRecords, selectedProduct])

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalUnitsSold = filteredRecords.reduce((sum, record) => sum + record.units_sold, 0)
    const totalPeriods = filteredRecords.length

    // Calculate average daily sales
    let totalDays = 0
    filteredRecords.forEach(record => {
      const start = new Date(record.start_date)
      const end = new Date(record.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      totalDays += days
    })
    const avgDailySales = totalDays > 0 ? (totalUnitsSold / totalDays).toFixed(2) : '0'

    // Calculate total COGS (if product selected)
    let totalCOGS = 0
    if (selectedProduct !== 'all') {
      const product = products.find(p => p.id === selectedProduct)
      if (product) {
        const productRecords = salesRecords.filter(r => r.product_id === selectedProduct)
        productRecords.forEach(record => {
          if (record.products?.current_cost) {
            totalCOGS += record.units_sold * record.products.current_cost
          }
        })
      }
    }

    return {
      totalUnitsSold,
      totalPeriods,
      avgDailySales,
      totalCOGS: totalCOGS > 0 ? totalCOGS.toFixed(2) : null,
    }
  }, [filteredRecords, salesRecords, selectedProduct, products])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateDaysBetween = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Units Sold</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{summary.totalUnitsSold}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Sales Periods</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{summary.totalPeriods}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Avg Daily Sales</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{summary.avgDailySales}</div>
          <div className="text-xs text-gray-500 mt-1">units/day</div>
        </div>
        {summary.totalCOGS && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total COGS</div>
            <div className="mt-2 text-3xl font-bold text-green-600">${summary.totalCOGS}</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by Product:
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[400px] border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="all">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
          {selectedProduct !== 'all' && (
            <button
              onClick={() => setSelectedProduct('all')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Sales Records Table */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sales data yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Sales records are automatically created when you add warehouse snapshots.
            Create at least two snapshots for the same product to see sales data.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                    Period
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Days
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Start
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Received
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    End
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Sold
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Per Day
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  const days = calculateDaysBetween(record.start_date, record.end_date)
                  const dailyAvg = days > 0 ? (record.units_sold / days).toFixed(1) : '0'

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 truncate" title={record.products?.name || 'Unknown'}>
                            {record.products?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {record.products?.sku || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-medium">
                          {formatDate(record.start_date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(record.end_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-gray-900">{days}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-700">{record.starting_inventory}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          +{record.units_received}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-700">{record.ending_inventory}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                          {record.units_sold}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-semibold text-indigo-600">{dailyAvg}</div>
                        <div className="text-xs text-gray-500">units/day</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
