import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import SalesTrackingView from '@/components/SalesTrackingView'

export default async function SalesPage() {
  const supabase = await createClient()

  // Fetch sales records with product details
  const { data: salesRecords, error: salesError } = await supabase
    .from('sales_records')
    .select(`
      *,
      products (
        id,
        sku,
        name,
        current_cost
      )
    `)
    .order('end_date', { ascending: false })

  if (salesError) {
    console.error('Error fetching sales records:', salesError)
  }

  // Fetch products for filtering
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name')
    .order('name')

  if (productsError) {
    console.error('Error fetching products:', productsError)
  }

  return (
    <MainLayout>
      <div className="px-8 py-6 max-w-[calc(100vw-16rem)] overflow-hidden">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Sales Tracking</h2>
          <p className="mt-1 text-sm text-gray-600">
            Auto-calculated sales data from warehouse snapshots. Track units sold, sales velocity, and inventory turnover.
          </p>
        </div>

        <SalesTrackingView
          salesRecords={salesRecords || []}
          products={products || []}
        />
      </div>
    </MainLayout>
  )
}
