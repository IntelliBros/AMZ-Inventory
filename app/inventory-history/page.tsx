import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getAccessibleUserIds } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import InventoryHistoryList from '@/components/InventoryHistoryList'

export default async function InventoryHistoryPage() {
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

  const { data: inventory, error } = await supabase
    .from('inventory_locations')
    .select(`
      *,
      products!inner (
        id,
        sku,
        name,
        current_cost,
        current_shipping_cost,
        user_id
      )
    `)
    .in('products.user_id', accessibleUserIds)
    .order('created_at', { ascending: false })

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Inventory History</h2>
          <p className="text-sm text-gray-600 mt-1">View all historical inventory changes and movements</p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading inventory history: {error.message}</p>
          </div>
        ) : (
          <InventoryHistoryList inventory={inventory || []} />
        )}
      </div>
    </MainLayout>
  )
}
