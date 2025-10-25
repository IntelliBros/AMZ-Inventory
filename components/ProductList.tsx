'use client'

import { Database } from '@/types/database.types'
import { useState } from 'react'
import ProductModal from './ProductModal'

type Product = Database['public']['Tables']['products']['Row']

interface ProductListProps {
  products: Product[]
}

export default function ProductList({ products }: ProductListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setSelectedProduct(null)
    setIsModalOpen(false)
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found. Add your first product to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-sm border border-[#D5D9D9] hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleEdit(product)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-6">
                {/* Left Section - Product Info */}
                <div className="flex-1 min-w-0">
                  {/* Product name and SKU */}
                  <div className="flex items-start gap-3 mb-2">
                    <h3 className="text-base font-semibold text-[#0F1111] flex-1 leading-tight" title={product.name}>
                      {product.name}
                    </h3>
                    <span className="px-3 py-1 text-xs font-bold rounded bg-[#FFF8E1] text-[#B7791F] font-mono flex-shrink-0 border border-[#F0C14B]">
                      {product.sku}
                    </span>
                  </div>

                  {/* ASIN/FNSKU and Description */}
                  <div className="space-y-1">
                    {(product.asin || product.fnsku) && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {product.asin && (
                          <span className="flex items-center">
                            <span className="mr-1.5 text-gray-500">ASIN:</span>
                            <span className="font-mono text-[#0F1111]">{product.asin}</span>
                          </span>
                        )}
                        {product.fnsku && (
                          <span className="flex items-center">
                            <span className="mr-1.5 text-gray-500">FNSKU:</span>
                            <span className="font-mono text-[#0F1111]">{product.fnsku}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                    )}
                  </div>
                </div>

                {/* Right Section - Costs */}
                <div className="flex flex-col gap-2 flex-shrink-0 min-w-[140px]">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Unit Cost</div>
                    <div className="text-xl font-bold text-[#0F1111]">${product.current_cost.toFixed(2)}</div>
                  </div>
                  {product.current_shipping_cost > 0 && (
                    <div className="text-right pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Shipping Cost</div>
                      <div className="text-sm font-semibold text-[#0F1111]">${product.current_shipping_cost.toFixed(2)}</div>
                    </div>
                  )}
                  {product.current_shipping_cost > 0 && (
                    <div className="text-right pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Total Landed</div>
                      <div className="text-lg font-bold text-[#146EB4]">
                        ${(product.current_cost + product.current_shipping_cost).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <ProductModal
          product={selectedProduct}
          onClose={handleClose}
        />
      )}
    </>
  )
}
