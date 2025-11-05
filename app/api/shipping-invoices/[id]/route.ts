import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
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

    // Get current team
    const cookieTeamId = cookieStore.get('current-team-id')?.value
    const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

    if (!currentTeamId) {
      return NextResponse.json(
        { error: 'No team selected' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status } = body

    const supabase = createServerClient()

    // Check that invoice belongs to current team
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from('shipping_invoices')
      .select('team_id, invoice_number, status')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Shipping invoice not found' },
        { status: 404 }
      )
    }

    if (invoice.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Shipping invoice not found' },
        { status: 404 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to update shipping invoices' },
        { status: 403 }
      )
    }

    // Update invoice status
    const { data, error } = await (supabase as any)
      .from('shipping_invoices')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating shipping invoice status:', error)
      throw error
    }

    // If marking as delivered, move inventory from en_route to fba
    if (status === 'delivered' && invoice.status !== 'delivered') {
      // Get all line items for this invoice
      const { data: lineItems } = await (supabase as any)
        .from('shipping_line_items')
        .select('product_id, quantity')
        .eq('shipping_invoice_id', id)

      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          // Find en_route inventory for this product
          const { data: enRouteInventories } = await supabase
            .from('inventory_locations')
            .select('*')
            .eq('product_id', item.product_id)
            .eq('location_type', 'en_route')
            .eq('notes', `Shipment ${invoice.invoice_number}`)
            .order('created_at', { ascending: true })

          if (enRouteInventories && enRouteInventories.length > 0) {
            let remainingToDeliver = item.quantity

            // Remove from en_route (FIFO)
            for (const enRoute of enRouteInventories) {
              if (remainingToDeliver <= 0) break

              const enRouteQty = (enRoute as any).quantity
              if (enRouteQty <= remainingToDeliver) {
                await supabase.from('inventory_locations').delete().eq('id', (enRoute as any).id)
                remainingToDeliver -= enRouteQty
              } else {
                await (supabase as any)
                  .from('inventory_locations')
                  .update({ quantity: enRouteQty - remainingToDeliver })
                  .eq('id', (enRoute as any).id)
                remainingToDeliver = 0
              }
            }

            // Create FBA inventory
            const unitCost = (enRouteInventories[0] as any)?.unit_cost || 0
            const unitShippingCost = (enRouteInventories[0] as any)?.unit_shipping_cost || 0

            await (supabase as any).from('inventory_locations').insert({
              product_id: item.product_id,
              location_type: 'fba',
              quantity: item.quantity,
              unit_cost: unitCost,
              unit_shipping_cost: unitShippingCost,
              po_id: null,
              notes: `Delivered: Shipment ${invoice.invoice_number}`
            })
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

    // Get current team
    const cookieTeamId = cookieStore.get('current-team-id')?.value
    const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

    if (!currentTeamId) {
      return NextResponse.json(
        { error: 'No team selected' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check that invoice belongs to current team and get invoice_number
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from('shipping_invoices')
      .select('team_id, invoice_number')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Shipping invoice not found' },
        { status: 404 }
      )
    }

    if (invoice.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Shipping invoice not found' },
        { status: 404 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to delete shipping invoices' },
        { status: 403 }
      )
    }

    // Before deleting, move inventory back from en_route to storage
    const { data: lineItems } = await (supabase as any)
      .from('shipping_line_items')
      .select('product_id, quantity')
      .eq('shipping_invoice_id', id)

    if (lineItems && lineItems.length > 0) {
      for (const item of lineItems) {
        // Find en_route inventory for this shipment
        const { data: enRouteInventories } = await supabase
          .from('inventory_locations')
          .select('*')
          .eq('product_id', item.product_id)
          .eq('location_type', 'en_route')
          .eq('notes', `Shipment ${invoice.invoice_number}`)
          .order('created_at', { ascending: true })

        if (enRouteInventories && enRouteInventories.length > 0) {
          // Get unit costs from the first en_route record
          const unitCost = (enRouteInventories[0] as any)?.unit_cost || 0
          const unitShippingCost = (enRouteInventories[0] as any)?.unit_shipping_cost || 0

          // Delete en_route inventory
          for (const enRoute of enRouteInventories) {
            await supabase
              .from('inventory_locations')
              .delete()
              .eq('id', (enRoute as any).id)
          }

          // Create storage inventory to return the items
          await (supabase as any).from('inventory_locations').insert({
            product_id: item.product_id,
            location_type: 'storage',
            quantity: item.quantity,
            unit_cost: unitCost,
            unit_shipping_cost: unitShippingCost,
            po_id: null,
            notes: `Returned from deleted shipment ${invoice.invoice_number}`
          })
        }
      }
    }

    // Delete the invoice (line items will be cascade deleted)
    const { error } = await supabase
      .from('shipping_invoices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting shipping invoice:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting shipping invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete shipping invoice' },
      { status: 500 }
    )
  }
}
