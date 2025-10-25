import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getAccessibleUserIds } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import PurchaseOrderList from '@/components/PurchaseOrderList'
import AddPurchaseOrderButton from '@/components/AddPurchaseOrderButton'

export default async function PurchaseOrdersPage() {
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

  const { data: purchaseOrders, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      po_line_items (
        *,
        products (
          id,
          sku,
          name
        )
      )
    `)
    .in('user_id', accessibleUserIds)
    .order('created_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, current_cost')
    .in('user_id', accessibleUserIds)
    .order('name')

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .in('user_id', accessibleUserIds)
    .order('name')

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Purchase Orders</h2>
          <AddPurchaseOrderButton products={products || []} suppliers={suppliers || []} />
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading purchase orders: {error.message}</p>
          </div>
        ) : (
          <PurchaseOrderList purchaseOrders={purchaseOrders || []} products={products || []} suppliers={suppliers || []} />
        )}
      </div>
    </MainLayout>
  )
}
