import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import InventoryList from '@/components/InventoryList'
import AddInventoryButton from '@/components/AddInventoryButton'

// Enable static optimization
export const revalidate = 60 // Revalidate every 60 seconds

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: inventory, error } = await supabase
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
    .order('created_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, current_cost, current_shipping_cost')
    .order('name')

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
            warehouseSnapshots={warehouseSnapshots || []}
          />
        )}
      </div>
    </MainLayout>
  )
}
