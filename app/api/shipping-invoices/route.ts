import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/shipping-invoices - Create a new shipping invoice with line items
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    const currentUser = await getCurrentUser(token)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get current team
    const cookieTeamId = cookieStore.get('current-team-id')?.value
    const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

    if (!currentTeamId) {
      return NextResponse.json(
        { error: 'No team selected' },
        { status: 400 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to create shipping invoices' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      invoice_number,
      shipping_date,
      carrier,
      tracking_number,
      status,
      total_shipping_cost,
      notes,
      line_items,
    } = body

    if (!invoice_number || !shipping_date || !carrier || !total_shipping_cost) {
      return NextResponse.json(
        { error: 'Invoice number, shipping date, carrier, and total cost are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const invoiceData = {
      invoice_number,
      shipping_date,
      carrier,
      tracking_number: tracking_number || null,
      status: status || 'pending',
      total_shipping_cost,
      notes: notes || null,
      user_id: currentUser.id,
      team_id: currentTeamId,
    }

    // @ts-ignore - Supabase types don't recognize shipping_invoices table
    const { data: invoice, error: invoiceError } = await supabase
      .from('shipping_invoices')
      // @ts-ignore - Supabase types don't recognize shipping_invoices table
      .insert([invoiceData])
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Insert line items and convert inventory from storage to en_route
    if (line_items && line_items.length > 0) {
      const lineItemsData = line_items.map((item: any) => ({
        // @ts-ignore
        shipping_invoice_id: invoice.id,
        product_id: item.product_id,
        po_line_item_id: null,
        quantity: item.quantity,
        unit_shipping_cost: item.unit_shipping_cost,
        total_shipping_cost: item.quantity * item.unit_shipping_cost,
      }))

      // @ts-ignore - Supabase types don't recognize shipping_line_items table
      const { error: lineItemsError } = await supabase
        .from('shipping_line_items')
        // @ts-ignore - Supabase types don't recognize shipping_line_items table
        .insert(lineItemsData)

      if (lineItemsError) throw lineItemsError

      // Convert inventory from storage to en_route (FIFO)
      for (const item of line_items) {
        // @ts-ignore
        const { data: storageInventories } = await supabase
          .from('inventory_locations')
          .select('*')
          .eq('product_id', item.product_id)
          .eq('location_type', 'storage')
          .order('created_at', { ascending: true })

        if (storageInventories && storageInventories.length > 0) {
          let remainingToShip = item.quantity

          // @ts-ignore
          for (const storage of storageInventories) {
            if (remainingToShip <= 0) break
            // @ts-ignore
            if (storage.quantity <= remainingToShip) {
              // Fully consume this storage record
              // @ts-ignore
              await supabase.from('inventory_locations').delete().eq('id', storage.id)
              // @ts-ignore
              remainingToShip -= storage.quantity
            } else {
              // Partially consume
              await supabase
                .from('inventory_locations')
                // @ts-ignore
                .update({ quantity: storage.quantity - remainingToShip })
                // @ts-ignore
                .eq('id', storage.id)
              remainingToShip = 0
            }
          }

          // Get the product's unit cost from the first storage record
          // @ts-ignore
          const unitCost = storageInventories[0]?.unit_cost || 0

          // Create en_route inventory
          // @ts-ignore
          const { error: enRouteError } = await supabase.from('inventory_locations').insert([{
            product_id: item.product_id,
            location_type: 'en_route',
            quantity: item.quantity,
            unit_cost: unitCost,
            unit_shipping_cost: item.unit_shipping_cost,
            po_id: null,
            notes: `Shipment ${invoice_number}`
          }])

          if (enRouteError) {
            console.error('Error creating en_route inventory:', enRouteError)
            throw enRouteError
          }
        }
      }
    }

    return NextResponse.json({ shipping_invoice: invoice })
  } catch (error: any) {
    console.error('Error creating shipping invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create shipping invoice' },
      { status: 500 }
    )
  }
}
