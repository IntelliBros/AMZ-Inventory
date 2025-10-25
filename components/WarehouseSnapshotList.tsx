'use client'

import { useState } from 'react'
import { Database } from '@/types/database.types'
import WarehouseSnapshotModal from './WarehouseSnapshotModal'

type WarehouseSnapshot = Database['public']['Tables']['warehouse_snapshots']['Row'] & {
  products: {
    id: string
    sku: string
    name: string
  } | null
}

interface Product {
  id: string
  sku: string
  name: string
}

interface WarehouseSnapshotListProps {
  snapshots: WarehouseSnapshot[]
  products: Product[]
}

export default function WarehouseSnapshotList({ snapshots, products }: WarehouseSnapshotListProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<WarehouseSnapshot | null>(null)

  const handleCreate = () => {
    setSelectedSnapshot(null)
    setShowModal(true)
  }

  const handleEdit = (snapshot: WarehouseSnapshot) => {
    setSelectedSnapshot(snapshot)
    setShowModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + New Snapshot
        </button>
      </div>

      {snapshots.length === 0 ? (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No snapshots yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first warehouse inventory snapshot.
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              + Create First Snapshot
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(snapshot)}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatDate(snapshot.snapshot_date)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      <div className="max-w-md">
                        <div className="truncate" title={snapshot.products?.name || 'Unknown'}>
                          {snapshot.products?.name || 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {snapshot.products?.sku || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {snapshot.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={snapshot.notes || undefined}>
                        {snapshot.notes || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(snapshot)
                        }}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <WarehouseSnapshotModal
          snapshot={selectedSnapshot}
          products={products}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
