import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getAccessibleUserIds } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import Dashboard from '@/components/Dashboard'

// Enable static optimization where possible
export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage() {
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

  // Get all inventory with product details (filtered by accessible users)
  const { data: inventory } = await supabase
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

  // Get all products (filtered by accessible users)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .in('user_id', accessibleUserIds)

  // Get all purchase orders (filtered by accessible users)
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      po_line_items (
        quantity,
        unit_cost
      )
    `)
    .in('user_id', accessibleUserIds)

  // Get recent sales records for dashboard (filtered by accessible users)
  const { data: salesRecords } = await supabase
    .from('sales_records')
    .select('*')
    .in('user_id', accessibleUserIds)
    .order('end_date', { ascending: false })
    .limit(30)

  // Get latest warehouse snapshots for each product (filtered by accessible users)
  const { data: warehouseSnapshots } = await supabase
    .from('warehouse_snapshots')
    .select(`
      product_id,
      quantity,
      snapshot_date,
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
    .order('snapshot_date', { ascending: false })

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <Dashboard
          inventory={inventory || []}
          products={products || []}
          purchaseOrders={purchaseOrders || []}
          salesRecords={salesRecords || []}
          warehouseSnapshots={warehouseSnapshots || []}
        />
      </div>
    </MainLayout>
  )
}
