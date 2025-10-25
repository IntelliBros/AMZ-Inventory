import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import Dashboard from '@/components/Dashboard'

// Enable static optimization where possible
export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient()

  // Get all inventory with product details
  const { data: inventory } = await supabase
    .from('inventory_locations')
    .select(`
      *,
      products (
        id,
        sku,
        name,
        current_cost,
        current_shipping_cost
      )
    `)

  // Get all products
  const { data: products } = await supabase
    .from('products')
    .select('*')

  // Get all purchase orders
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      po_line_items (
        quantity,
        unit_cost
      )
    `)

  // Get recent sales records for dashboard
  const { data: salesRecords } = await supabase
    .from('sales_records')
    .select('*')
    .order('end_date', { ascending: false })
    .limit(30)

  // Get latest warehouse snapshots for each product
  const { data: warehouseSnapshots } = await supabase
    .from('warehouse_snapshots')
    .select(`
      product_id,
      quantity,
      snapshot_date,
      products (
        id,
        sku,
        name,
        current_cost,
        current_shipping_cost
      )
    `)
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
