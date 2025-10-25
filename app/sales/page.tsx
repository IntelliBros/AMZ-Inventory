import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
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

  // Get current team ID from cookie or default to user's first team
  const teamIdCookie = cookieStore.get('current-team-id')?.value
  const currentTeamId = await getCurrentTeamId(teamIdCookie, currentUser.id)

  if (!currentTeamId) {
    throw new Error('No team access')
  }

  // Fetch sales records with product details (filtered by team)
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
    .eq('team_id', currentTeamId)
    .order('end_date', { ascending: false })

  if (salesError) {
    console.error('Error fetching sales records:', salesError)
  }

  // Fetch products for filtering (filtered by team)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name')
    .eq('team_id', currentTeamId)
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
