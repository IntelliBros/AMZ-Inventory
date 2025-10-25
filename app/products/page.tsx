import { createClient } from '@/lib/supabase/server'
import MainLayout from '@/components/MainLayout'
import ProductList from '@/components/ProductList'
import AddProductButton from '@/components/AddProductButton'

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
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
