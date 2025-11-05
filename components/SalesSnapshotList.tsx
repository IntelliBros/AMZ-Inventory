'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type SalesSnapshot = Database['public']['Tables']['sales_snapshots']['Row'] & {
  products: {
    id: string
    sku: string
    name: string
    asin: string | null
    current_cost: number
  } | null
}

interface SalesSnapshotListProps {
  salesSnapshots: SalesSnapshot[]
}

interface GroupedPeriod {
  periodStart: string
  periodEnd: string
  snapshots: SalesSnapshot[]
  totalUnits: number
  totalRevenue: number
}

export default function SalesSnapshotList({ salesSnapshots }: SalesSnapshotListProps) {
  const router = useRouter()
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Group snapshots by period
  const groupedPeriods: GroupedPeriod[] = []
  salesSnapshots.forEach((snapshot) => {
    const periodKey = `${snapshot.period_start}_${snapshot.period_end}`
    let period = groupedPeriods.find(
      (p) => p.periodStart === snapshot.period_start && p.periodEnd === snapshot.period_end
    )

    if (!period) {
      period = {
        periodStart: snapshot.period_start,
        periodEnd: snapshot.period_end,
        snapshots: [],
        totalUnits: 0,
        totalRevenue: 0
      }
      groupedPeriods.push(period)
    }

    period.snapshots.push(snapshot)
    period.totalUnits += snapshot.units_sold
    period.totalRevenue += snapshot.revenue
  })

  const togglePeriod = (periodKey: string) => {
    const newExpanded = new Set(expandedPeriods)
    if (newExpanded.has(periodKey)) {
      newExpanded.delete(periodKey)
    } else {
      newExpanded.add(periodKey)
    }
    setExpandedPeriods(newExpanded)
  }

  const handleDelete = async (snapshotId: string) => {
    if (!confirm('Delete this sales snapshot? This will restore the inventory that was consumed.')) {
      return
    }

    setDeletingId(snapshotId)

    try {
      const response = await fetch(`/api/sales-snapshots/${snapshotId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete snapshot')
      }

      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to delete snapshot')
    } finally {
      setDeletingId(null)
    }
  }

  if (groupedPeriods.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-gray-500">No sales data yet. Import your first sales report to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groupedPeriods.map((period) => {
        const periodKey = `${period.periodStart}_${period.periodEnd}`
        const isExpanded = expandedPeriods.has(periodKey)
        const startDate = new Date(period.periodStart).toLocaleDateString()
        const endDate = new Date(period.periodEnd).toLocaleDateString()

        return (
          <div key={periodKey} className="bg-white rounded-lg shadow-sm border border-[#D5D9D9]">
            {/* Period Header */}
            <div
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => togglePeriod(periodKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#0F1111] mb-2">
                    Sales Period: {startDate} - {endDate}
                  </h3>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Products:</span>
                      <span className="ml-2 font-semibold text-[#0F1111]">{period.snapshots.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Units:</span>
                      <span className="ml-2 font-semibold text-[#0F1111]">{period.totalUnits}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Revenue:</span>
                      <span className="ml-2 font-semibold text-green-600">${period.totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <svg
                  className={`h-6 w-6 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Product Breakdown */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-5">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {period.snapshots.map((snapshot) => {
                        const avgPrice = snapshot.units_sold > 0 ? snapshot.revenue / snapshot.units_sold : 0
                        return (
                          <tr key={snapshot.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {snapshot.products?.name || 'Unknown Product'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {snapshot.products?.sku || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {snapshot.units_sold}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              ${snapshot.revenue.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                              ${avgPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <button
                                onClick={() => handleDelete(snapshot.id)}
                                disabled={deletingId === snapshot.id}
                                className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                              >
                                {deletingId === snapshot.id ? 'Deleting...' : 'Delete'}
                              </button>
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
      })}
    </div>
  )
}
