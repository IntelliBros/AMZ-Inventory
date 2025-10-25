'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ArchiveBoxIcon,
  ClockIcon,
  ShoppingCartIcon,
  TruckIcon,
  BuildingOfficeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Products', href: '/products', icon: CubeIcon },
  { name: 'Suppliers', href: '/suppliers', icon: BuildingStorefrontIcon },
  { name: 'Inventory', href: '/inventory', icon: ArchiveBoxIcon },
  { name: 'Inventory History', href: '/inventory-history', icon: ClockIcon },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCartIcon },
  { name: 'Shipping', href: '/shipping', icon: TruckIcon },
  { name: 'Warehouse', href: '/warehouse-snapshots', icon: BuildingOfficeIcon },
  { name: 'Sales', href: '/sales', icon: ChartBarIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#232F3E] flex flex-col shadow-lg z-10">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">
          Amazon FBA
          <span className="block text-sm font-normal text-gray-300 mt-1">Inventory Manager</span>
        </h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#FF9900] text-[#232F3E] shadow-md'
                      : 'text-gray-300 hover:bg-[#37475A] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          &copy; 2025 FBA Inventory
        </p>
      </div>
    </aside>
  )
}
