'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'Suppliers', href: '/suppliers' },
  { name: 'Inventory', href: '/inventory' },
  { name: 'Inventory History', href: '/inventory-history' },
  { name: 'Purchase Orders', href: '/purchase-orders' },
  { name: 'Shipping', href: '/shipping' },
  { name: 'Warehouse', href: '/warehouse-snapshots' },
  { name: 'Sales', href: '/sales' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 py-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
