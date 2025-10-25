import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import PurchaseOrderList from '@/components/PurchaseOrderList'
import AddPurchaseOrderButton from '@/components/AddPurchaseOrderButton'

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()

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
    .order('created_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, current_cost')
    .order('name')

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
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
