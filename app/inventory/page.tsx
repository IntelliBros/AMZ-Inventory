import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import InventoryList from '@/components/InventoryList'
import AddInventoryButton from '@/components/AddInventoryButton'

// Enable static optimization
export const revalidate = 60 // Revalidate every 60 seconds

export default async function InventoryPage() {
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
        team_id
      )
    `)
    .eq('products.team_id', currentTeamId)
    .order('created_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, current_cost, current_shipping_cost')
    .eq('team_id', currentTeamId)
    .order('name')

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Inventory Locations</h2>
          <AddInventoryButton products={products || []} />
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading inventory: {error.message}</p>
          </div>
        ) : (
          <InventoryList
            inventory={inventory || []}
            products={products || []}
          />
        )}
      </div>
    </MainLayout>
  )
}
