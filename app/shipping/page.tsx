import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { cookies } from 'next/headers'
import MainLayout from '@/components/MainLayout'
import ShippingInvoiceList from '@/components/ShippingInvoiceList'
import AddShippingInvoiceButton from '@/components/AddShippingInvoiceButton'

export default async function ShippingPage() {
  const supabase = await createClient()

  // Get current user from cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  const currentUser = await getCurrentUser(token)

  if (!currentUser) {
    throw new Error('Not authenticated')
  }

  // Get current team ID from cookie or default to user's first team
  const teamIdCookie = cookieStore.get('current-team-id')?.value
  const currentTeamId = await getCurrentTeamId(teamIdCookie, currentUser.id)

  if (!currentTeamId) {
    throw new Error('No team access')
  }

  const { data: shippingInvoices, error } = await supabase
    .from('shipping_invoices')
    .select(`
      id,
      created_at,
      updated_at,
      user_id,
      team_id,
      invoice_number,
      shipping_date,
      delivery_date,
      carrier,
      tracking_number,
      status,
      total_shipping_cost,
      notes,
      document_url,
      shipping_line_items (
        *,
        products (
          id,
          sku,
          name
        )
      )
    `)
    .eq('team_id', currentTeamId)
    .order('created_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, current_shipping_cost, carton_length_cm, carton_width_cm, carton_height_cm, carton_weight_kg, units_per_carton')
    .eq('team_id', currentTeamId)
    .order('name')

  return (
    <MainLayout>
      <div className="px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0F1111]">Shipping Invoices</h2>
          <AddShippingInvoiceButton
            products={products || []}
          />
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error loading shipping invoices: {error.message}</p>
          </div>
        ) : (
          <ShippingInvoiceList
            shippingInvoices={shippingInvoices || []}
            products={products || []}
          />
        )}
      </div>
    </MainLayout>
  )
}
