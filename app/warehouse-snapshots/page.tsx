import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import WarehouseSnapshotList from '@/components/WarehouseSnapshotList'

export default async function WarehouseSnapshotsPage() {
  const supabase = await createClient()

  // Fetch warehouse snapshots with product details
  const { data: snapshots, error: snapshotsError } = await supabase
    .from('warehouse_snapshots')
    .select(`
      *,
      products (
        id,
        sku,
        name
      )
    `)
    .order('snapshot_date', { ascending: false })

  if (snapshotsError) {
    console.error('Error fetching snapshots:', snapshotsError)
  }

  // Fetch products for dropdown
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name')
    .order('name')

  if (productsError) {
    console.error('Error fetching products:', productsError)
  }

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Warehouse Snapshots</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track inventory levels at Amazon warehouse over time. Weekly snapshots automatically calculate sales.
          </p>
        </div>

        <WarehouseSnapshotList
          snapshots={snapshots || []}
          products={products || []}
        />
      </div>
    </MainLayout>
  )
}
