import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import SupplierList from '@/components/SupplierList'
import AddSupplierButton from '@/components/AddSupplierButton'

export default async function SuppliersPage() {
  const supabase = await createClient()

  // Get current user from cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  const currentUser = await getCurrentUser(token)

  if (!currentUser) {
    throw new Error('Not authenticated')
  }

  // Get team from cookie and get current team ID
  const team = cookieStore.get('team')?.value
  const currentTeamId = await getCurrentTeamId(team, currentUser.id)

  if (!currentTeamId) {
    throw new Error('No team access found')
  }

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('team_id', currentTeamId)
    .order('name')

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Suppliers</h2>
          <AddSupplierButton />
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading suppliers: {error.message}</p>
          </div>
        ) : (
          <SupplierList suppliers={suppliers || []} />
        )}
      </div>
    </MainLayout>
  )
}
