'use client'

import { useState } from 'react'
import { Database } from '@/types/database.types'
import InventoryModal from './InventoryModal'

type InventoryLocation = Database['public']['Tables']['inventory_locations']['Row'] & {
  products: {
    id: string
    sku: string
    name: string
    current_cost: number
    current_shipping_cost: number
  } | null
}

interface InventoryHistoryListProps {
  inventory: InventoryLocation[]
}

const locationTypeLabels = {
  warehouse: 'Amazon Warehouse',
  en_route: 'En Route',
  storage: 'Storage',
  production: 'In Production',
}

const locationTypeColors = {
  warehouse: 'bg-blue-100 text-blue-800',
  en_route: 'bg-yellow-100 text-yellow-800',
  storage: 'bg-purple-100 text-purple-800',
  production: 'bg-green-100 text-green-800',
}

export default function InventoryHistoryList({ inventory }: InventoryHistoryListProps) {
  const [selectedInventory, setSelectedInventory] = useState<InventoryLocation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleView = (item: InventoryLocation) => {
    setSelectedInventory(item)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setSelectedInventory(null)
    setIsModalOpen(false)
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No inventory history found.</p>
      </div>
    )
  }

  return (
    <>
      {/* Inventory History Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                  Product
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shipping/Unit
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => {
                const totalValue = item.quantity * (item.unit_cost + item.unit_shipping_cost)
                const createdDate = new Date(item.created_at)

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleView(item)}
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {createdDate.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[280px]">
                        {item.products?.name || 'Unknown Product'}
                      </div>
                      <div className="text-xs text-gray-500">
                        SKU: {item.products?.sku || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${locationTypeColors[item.location_type]}`}>
                        {locationTypeLabels[item.location_type]}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${item.unit_cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${item.unit_shipping_cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">${totalValue.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-500 truncate max-w-[190px]">
                        {item.notes || '-'}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedInventory && (
        <InventoryModal
          inventory={selectedInventory}
          products={[]}
          onClose={handleClose}
        />
      )}
    </>
  )
}
