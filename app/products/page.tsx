import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import ProductList from '@/components/ProductList'
import AddProductButton from '@/components/AddProductButton'

export default async function ProductsPage() {
  const supabase = await createClient()

  // Get current user from cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  const currentUser = await getCurrentUser(token)

  if (!currentUser) {
    throw new Error('Not authenticated')
  }

  // Get team from cookie and get current team ID
  const teamIdCookie = cookieStore.get('current-team-id')?.value
  const currentTeamId = await getCurrentTeamId(teamIdCookie, currentUser.id)

  if (!currentTeamId) {
    throw new Error('No team access')
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('team_id', currentTeamId)
    .order('created_at', { ascending: false })

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Products</h2>
          <AddProductButton />
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading products: {error.message}</p>
          </div>
        ) : (
          <ProductList products={products || []} />
        )}
      </div>
    </MainLayout>
  )
}
