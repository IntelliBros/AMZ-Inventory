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
    const { status, first_received_date, fully_received_date } = body

    const supabase = createServerClient()

    // Check that invoice belongs to current team
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from('shipping_invoices')
      .select('team_id, invoice_number, status, first_received_date, fully_received_date')
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

    // Update invoice status and dates
    const updateData: {
      status: string
      first_received_date?: string | null
      fully_received_date?: string | null
    } = { status }

    if (first_received_date !== undefined) {
      updateData.first_received_date = first_received_date
    }
    if (fully_received_date !== undefined) {
      updateData.fully_received_date = fully_received_date
    }

    const { data, error } = await (supabase as any)
      .from('shipping_invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating shipping invoice status:', error)
      throw error
    }

    // If marking as "receiving", move inventory from en_route to receiving
    if (status === 'receiving' && invoice.status !== 'receiving') {
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
            .eq('notes', `Shipped on ${new Date(invoice.shipping_date || '').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - Shipment ${invoice.invoice_number} via ${invoice.carrier || ''} (${item.quantity} units)`)
            .order('created_at', { ascending: true })

          if (enRouteInventories && enRouteInventories.length > 0) {
            const unitCost = (enRouteInventories[0] as any)?.unit_cost || 0
            const unitShippingCost = (enRouteInventories[0] as any)?.unit_shipping_cost || 0

            // Delete en_route inventory
            for (const enRoute of enRouteInventories) {
              await supabase
                .from('inventory_locations')
                .delete()
                .eq('id', (enRoute as any).id)
            }

            // Create receiving inventory
            const firstReceivedDate = data?.first_received_date || first_received_date || new Date().toISOString().split('T')[0]
            const receivingDate = new Date(firstReceivedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })

            await (supabase as any).from('inventory_locations').insert({
              product_id: item.product_id,
              location_type: 'receiving',
              quantity: item.quantity,
              unit_cost: unitCost,
              unit_shipping_cost: unitShippingCost,
              po_id: null,
              notes: `Receiving started on ${receivingDate} - Shipment ${invoice.invoice_number} (${item.quantity} units)`
            })
          }
        }
      }
    }

    // If marking as delivered, move inventory from receiving to fba
    if (status === 'delivered' && invoice.status !== 'delivered') {
      // Get all line items for this invoice
      const { data: lineItems } = await (supabase as any)
        .from('shipping_line_items')
        .select('product_id, quantity')
        .eq('shipping_invoice_id', id)

      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          // Find receiving inventory for this product
          const { data: receivingInventories } = await supabase
            .from('inventory_locations')
            .select('*')
            .eq('product_id', item.product_id)
            .eq('location_type', 'receiving')
            .or(`notes.ilike.%Shipment ${invoice.invoice_number}%`)
            .order('created_at', { ascending: true })

          if (receivingInventories && receivingInventories.length > 0) {
            const unitCost = (receivingInventories[0] as any)?.unit_cost || 0
            const unitShippingCost = (receivingInventories[0] as any)?.unit_shipping_cost || 0

            // Delete receiving inventory
            for (const receiving of receivingInventories) {
              await supabase
                .from('inventory_locations')
                .delete()
                .eq('id', (receiving as any).id)
            }

            // Create FBA inventory with detailed delivery notes
            const actualFullyReceivedDate = data?.fully_received_date || fully_received_date || new Date().toISOString().split('T')[0]
            const deliveryDate = new Date(actualFullyReceivedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })

            await (supabase as any).from('inventory_locations').insert({
              product_id: item.product_id,
              location_type: 'fba',
              quantity: item.quantity,
              unit_cost: unitCost,
              unit_shipping_cost: unitShippingCost,
              po_id: null,
              notes: `Fully received at FBA on ${deliveryDate} - Shipment ${invoice.invoice_number} (${item.quantity} units)`
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
