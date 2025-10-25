import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getAccessibleUserIds } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import SalesTrackingView from '@/components/SalesTrackingView'

export default async function SalesPage() {
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

  // Fetch sales records with product details (filtered by accessible users)
  const { data: salesRecords, error: salesError } = await supabase
    .from('sales_records')
    .select(`
      *,
      products (
        id,
        sku,
        name,
        current_cost
      )
    `)
    .in('user_id', accessibleUserIds)
    .order('end_date', { ascending: false })

  if (salesError) {
    console.error('Error fetching sales records:', salesError)
  }

  // Fetch products for filtering (filtered by accessible users)
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
      <div className="px-8 py-6 max-w-[calc(100vw-16rem)] overflow-hidden">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Sales Tracking</h2>
          <p className="mt-1 text-sm text-gray-600">
            Auto-calculated sales data from warehouse snapshots. Track units sold, sales velocity, and inventory turnover.
          </p>
        </div>

        <SalesTrackingView
          salesRecords={salesRecords || []}
          products={products || []}
        />
      </div>
    </MainLayout>
  )
}
