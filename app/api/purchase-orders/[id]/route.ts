import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// PATCH /api/purchase-orders/[id] - Update a purchase order
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
    const {
      po_number,
      supplier_id,
      order_date,
      expected_delivery_date,
      status,
      notes,
      total_product_cost,
    } = body

    const supabase = createServerClient()

    // Check permissions first
    // @ts-ignore
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('user_id')
      .eq('id', id)
      .single()

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // @ts-ignore
    const canWrite = await hasWritePermission(currentUser.id, po.user_id)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to update purchase orders' },
        { status: 403 }
      )
    }

    const poData = {
      po_number,
      supplier: supplier_id, // Column is named 'supplier' not 'supplier_id'
      order_date,
      expected_delivery_date: expected_delivery_date || null,
      status,
      total_product_cost: total_product_cost || 0,
      notes: notes || null,
    }

    // @ts-ignore - Supabase types don't recognize purchase_orders table
    const { data, error } = await supabase
      .from('purchase_orders')
      // @ts-ignore - Supabase types don't recognize purchase_orders table
      .update(poData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ purchase_order: data })
  } catch (error: any) {
    console.error('Error updating purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Delete a purchase order
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

    // @ts-ignore - Supabase types don't recognize purchase_orders table
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
