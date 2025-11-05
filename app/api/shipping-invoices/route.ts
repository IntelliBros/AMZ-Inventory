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

    // Check if invoice number already exists for this user
    const { data: existingInvoice } = await (supabase as any)
      .from('shipping_invoices')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('invoice_number', invoice_number)
      .single()

    if (existingInvoice) {
      return NextResponse.json(
        { error: `Invoice number "${invoice_number}" already exists. Please use a different invoice number.` },
        { status: 400 }
      )
    }

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

    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from('shipping_invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError) {
      console.error('Supabase error creating shipping invoice:', invoiceError)
      throw invoiceError
    }

    // Insert line items and convert inventory from storage to en_route
    if (line_items && line_items.length > 0) {
      const lineItemsData = line_items.map((item: any) => ({
        shipping_invoice_id: invoice.id,
        product_id: item.product_id,
        po_line_item_id: null,
        quantity: item.quantity,
        unit_shipping_cost: item.unit_shipping_cost,
        total_shipping_cost: item.quantity * item.unit_shipping_cost,
      }))

      const { error: lineItemsError } = await (supabase as any)
        .from('shipping_line_items')
        .insert(lineItemsData)

      if (lineItemsError) {
        console.error('Error creating shipping line items:', lineItemsError)
        throw lineItemsError
      }

      // Convert inventory from storage to en_route (FIFO)
      for (const item of line_items) {
        const { data: storageInventories } = await supabase
          .from('inventory_locations')
          .select('*')
          .eq('product_id', item.product_id)
          .eq('location_type', 'storage')
          .order('created_at', { ascending: true })

        if (storageInventories && storageInventories.length > 0) {
          let remainingToShip = item.quantity

          for (const storage of storageInventories) {
            if (remainingToShip <= 0) break

            const storageQty = (storage as any).quantity
            if (storageQty <= remainingToShip) {
              // Fully consume this storage record
              await supabase.from('inventory_locations').delete().eq('id', (storage as any).id)
              remainingToShip -= storageQty
            } else {
              // Partially consume
              await (supabase as any)
                .from('inventory_locations')
                .update({ quantity: storageQty - remainingToShip })
                .eq('id', (storage as any).id)
              remainingToShip = 0
            }
          }

          // Get the product's unit cost from the first storage record
          const unitCost = (storageInventories[0] as any)?.unit_cost || 0
          const shipmentDate = new Date(shipping_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })

          // Create en_route inventory with detailed shipping notes
          const { error: enRouteError } = await (supabase as any).from('inventory_locations').insert({
            product_id: item.product_id,
            location_type: 'en_route',
            quantity: item.quantity,
            unit_cost: unitCost,
            unit_shipping_cost: item.unit_shipping_cost,
            po_id: null,
            notes: `Shipped on ${shipmentDate} - Shipment ${invoice_number} via ${carrier} (${item.quantity} units)`
          })

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
