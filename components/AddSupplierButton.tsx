'use client'

import { useState } from 'react'
import SupplierModal from './SupplierModal'

export default function AddSupplierButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Add Supplier
      </button>

      {isModalOpen && (
        <SupplierModal
          supplier={null}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
