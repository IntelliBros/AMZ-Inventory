import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import SalesSnapshotList from '@/components/SalesSnapshotList'
import Link from 'next/link'

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

  // Fetch sales snapshots with product details
  const { data: salesSnapshots, error: salesError } = await (supabase as any)
    .from('sales_snapshots')
    .select(`
      *,
      products (
        id,
        sku,
        name,
        asin,
        current_cost
      )
    `)
    .eq('team_id', currentTeamId)
    .order('period_start', { ascending: false })

  if (salesError) {
    console.error('Error fetching sales snapshots:', salesError)
  }

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1111]">Sales Tracking</h2>
            <p className="mt-1 text-sm text-gray-600">
              Actual sales data imported from Amazon Business Reports
            </p>
          </div>
          <Link
            href="/sales-import"
            className="px-4 py-2 bg-[#FF9900] text-white rounded-md hover:bg-[#FA8900] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900] font-medium"
          >
            Import Sales Data
          </Link>
        </div>

        {salesError ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading sales data: {salesError.message}</p>
          </div>
        ) : (
          <SalesSnapshotList salesSnapshots={salesSnapshots || []} />
        )}
      </div>
    </MainLayout>
  )
}
