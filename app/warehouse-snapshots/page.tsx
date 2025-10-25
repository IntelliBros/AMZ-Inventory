import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getAccessibleUserIds } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import WarehouseSnapshotList from '@/components/WarehouseSnapshotList'

export default async function WarehouseSnapshotsPage() {
  const supabase = await createClient()

  // Get current user from cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  const currentUser = await getCurrentUser(token)

  if (!currentUser) {
    throw new Error('Not authenticated')
  }

  // Get accessible user IDs (own ID + team member access)
  const accessibleUserIds = await getAccessibleUserIds(currentUser.id)

  // Fetch warehouse snapshots with product details (filtered by accessible users)
  const { data: snapshots, error: snapshotsError } = await supabase
    .from('warehouse_snapshots')
    .select(`
      *,
      products (
        id,
        sku,
        name
      )
    `)
    .in('user_id', accessibleUserIds)
    .order('snapshot_date', { ascending: false })

  if (snapshotsError) {
    console.error('Error fetching snapshots:', snapshotsError)
  }

  // Fetch products for dropdown (filtered by accessible users)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name')
    .in('user_id', accessibleUserIds)
    .order('name')

  if (productsError) {
    console.error('Error fetching products:', productsError)
  }

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Warehouse Snapshots</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track inventory levels at Amazon warehouse over time. Weekly snapshots automatically calculate sales.
          </p>
        </div>

        <WarehouseSnapshotList
          snapshots={snapshots || []}
          products={products || []}
        />
      </div>
    </MainLayout>
  )
}
