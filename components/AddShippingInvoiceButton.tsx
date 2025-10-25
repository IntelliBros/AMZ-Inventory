'use client'

import { useState } from 'react'
import ShippingInvoiceModal from './ShippingInvoiceModal'

interface Product {
  id: string
  sku: string
  name: string
  current_shipping_cost: number
}

interface AddShippingInvoiceButtonProps {
  products: Product[]
}

export default function AddShippingInvoiceButton({ products }: AddShippingInvoiceButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Add Shipping Invoice
      </button>

      {isModalOpen && (
        <ShippingInvoiceModal
          shippingInvoice={null}
          products={products}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
