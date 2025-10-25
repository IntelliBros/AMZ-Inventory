'use client'

import { Database } from '@/types/database.types'
import { useState } from 'react'
import SupplierModal from './SupplierModal'

type Supplier = Database['public']['Tables']['suppliers']['Row']

interface SupplierListProps {
  suppliers: Supplier[]
}

export default function SupplierList({ suppliers }: SupplierListProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setSelectedSupplier(null)
    setIsModalOpen(false)
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No suppliers found. Add your first supplier for easy selection in Purchase Orders.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-lg shadow-sm border border-[#D5D9D9] hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleEdit(supplier)}
          >
            <div className="p-5">
              {/* Supplier Name */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#0F1111]">
                  {supplier.name}
                </h3>
              </div>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {supplier.contact_person && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Contact Person</p>
                    <p className="text-sm text-[#0F1111] font-medium">{supplier.contact_person}</p>
                  </div>
                )}
                {supplier.email && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-[#146EB4] font-medium break-all">{supplier.email}</p>
                  </div>
                )}
                {supplier.phone && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-[#0F1111] font-medium">{supplier.phone}</p>
                  </div>
                )}
                {supplier.address && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-[#0F1111]">{supplier.address}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {supplier.notes && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 italic line-clamp-2">{supplier.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={handleClose}
        />
      )}
    </>
  )
}
