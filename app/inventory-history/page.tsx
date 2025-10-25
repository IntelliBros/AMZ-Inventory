import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import InventoryHistoryList from '@/components/InventoryHistoryList'

export default async function InventoryHistoryPage() {
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

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Inventory History</h2>
          <p className="text-sm text-gray-600 mt-1">View all historical inventory changes and movements</p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading inventory history: {error.message}</p>
          </div>
        ) : (
          <InventoryHistoryList inventory={inventory || []} />
        )}
      </div>
    </MainLayout>
  )
}
