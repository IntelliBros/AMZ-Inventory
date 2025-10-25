'use client'

import { useState } from 'react'
import InventoryModal from './InventoryModal'

interface Product {
  id: string
  sku: string
  name: string
  current_cost: number
  current_shipping_cost: number
}

interface AddInventoryButtonProps {
  products: Product[]
}

export default function AddInventoryButton({ products }: AddInventoryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Add Inventory
      </button>

      {isModalOpen && (
        <InventoryModal
          inventory={null}
          products={products}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
