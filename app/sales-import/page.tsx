import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import SalesImportForm from '@/components/SalesImportForm'

export default async function SalesImportPage() {
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

  // Get products for SKU/ASIN lookup
  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, asin')
    .eq('team_id', currentTeamId)
    .order('name')

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Import Sales Data</h2>
          <p className="text-sm text-gray-600 mt-1">Upload a CSV file with sales data from Amazon Business Reports</p>
        </div>

        <SalesImportForm products={products || []} />
      </div>
    </MainLayout>
  )
}
