import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// PATCH /api/shipping-invoices/[id] - Update a shipping invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    const currentUser = await getCurrentUser(token)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = body

    const supabase = createServerClient()

    // Verify the invoice and check permissions
    // @ts-ignore
    const { data: invoice, error: invoiceError } = await supabase
      .from('shipping_invoices')
      .select('user_id, invoice_number, status')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Shipping invoice not found' },
        { status: 404 }
      )
    }

    // Check write permission
    // @ts-ignore
    const canWrite = await hasWritePermission(currentUser.id, invoice.user_id)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to update shipping invoices' },
        { status: 403 }
      )
    }

    // Update invoice status
    // @ts-ignore
    const { data, error } = await supabase
      .from('shipping_invoices')
      // @ts-ignore
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If marking as delivered, move inventory from en_route to fba
    // @ts-ignore
    if (status === 'delivered' && invoice.status !== 'delivered') {
      // Get all line items for this invoice
      // @ts-ignore
      const { data: lineItems } = await supabase
        .from('shipping_line_items')
        .select('product_id, quantity')
        .eq('shipping_invoice_id', id)

      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          // Find en_route inventory for this product
          // @ts-ignore
          const { data: enRouteInventories } = await supabase
            .from('inventory_locations')
            .select('*')
            // @ts-ignore
            .eq('product_id', item.product_id)
            .eq('location_type', 'en_route')
            // @ts-ignore
            .eq('notes', `Shipment ${invoice.invoice_number}`)
            .order('created_at', { ascending: true })

          if (enRouteInventories && enRouteInventories.length > 0) {
            // @ts-ignore
            let remainingToDeliver = item.quantity

            // Remove from en_route (FIFO)
            for (const enRoute of enRouteInventories) {
              if (remainingToDeliver <= 0) break
              // @ts-ignore
              if (enRoute.quantity <= remainingToDeliver) {
                // @ts-ignore
                await supabase.from('inventory_locations').delete().eq('id', enRoute.id)
                // @ts-ignore
                remainingToDeliver -= enRoute.quantity
              } else {
                await supabase
                  .from('inventory_locations')
                  // @ts-ignore
                  .update({ quantity: enRoute.quantity - remainingToDeliver })
                  // @ts-ignore
                  .eq('id', enRoute.id)
                remainingToDeliver = 0
              }
            }

            // Create FBA inventory
            // @ts-ignore
            const unitCost = enRouteInventories[0]?.unit_cost || 0
            // @ts-ignore
            const unitShippingCost = enRouteInventories[0]?.unit_shipping_cost || 0

            // @ts-ignore
            await supabase.from('inventory_locations').insert([{
              // @ts-ignore
              product_id: item.product_id,
              location_type: 'fba',
              // @ts-ignore
              quantity: item.quantity,
              unit_cost: unitCost,
              unit_shipping_cost: unitShippingCost,
              po_id: null,
              // @ts-ignore
              notes: `Delivered: Shipment ${invoice.invoice_number}`
            }])
          }
        }
      }
    }

    return NextResponse.json({ shipping_invoice: data })
  } catch (error: any) {
    console.error('Error updating shipping invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update shipping invoice' },
      { status: 500 }
    )
  }
}

// DELETE /api/shipping-invoices/[id] - Delete a shipping invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    const currentUser = await getCurrentUser(token)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Verify the invoice and check permissions
    // @ts-ignore
    const { data: invoice, error: invoiceError } = await supabase
      .from('shipping_invoices')
      .select('user_id')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Shipping invoice not found' },
        { status: 404 }
      )
    }

    // Check write permission
    // @ts-ignore
    const canWrite = await hasWritePermission(currentUser.id, invoice.user_id)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to delete shipping invoices' },
        { status: 403 }
      )
    }

    // Delete the invoice (line items will be cascade deleted)
    // @ts-ignore
    const { error } = await supabase
      .from('shipping_invoices')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting shipping invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete shipping invoice' },
      { status: 500 }
    )
  }
}
