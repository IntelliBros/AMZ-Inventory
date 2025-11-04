'use client'

import { useState } from 'react'
import PurchaseOrderModal from './PurchaseOrderModal'

interface Product {
  id: string
  sku: string
  name: string
  asin: string | null
  current_cost: number
}

interface Supplier {
  id: string
  name: string
}

interface AddPurchaseOrderButtonProps {
  products: Product[]
  suppliers: Supplier[]
}

export default function AddPurchaseOrderButton({ products, suppliers }: AddPurchaseOrderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Create Purchase Order
      </button>

      {isModalOpen && (
        <PurchaseOrderModal
          purchaseOrder={null}
          products={products}
          suppliers={suppliers}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
