import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/po-line-items - Create line items for a purchase order
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

    const body = await request.json()
    const { po_id, line_items } = body

    if (!po_id || !line_items || !Array.isArray(line_items)) {
      return NextResponse.json(
        { error: 'PO ID and line items array are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify the PO belongs to the current user
    // @ts-ignore - Supabase types don't recognize purchase_orders table
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('id', po_id)
      .eq('user_id', currentUser.id)
      .single()

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Insert line items
    const lineItemsData = line_items.map((item: any) => ({
      po_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_cost: item.quantity * item.unit_cost,
    }))

    // @ts-ignore - Supabase types don't recognize po_line_items table
    const { data, error } = await supabase
      .from('po_line_items')
      // @ts-ignore - Supabase types don't recognize po_line_items table
      .insert(lineItemsData)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ line_items: data })
  } catch (error: any) {
    console.error('Error creating line items:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create line items' },
      { status: 500 }
    )
  }
}

// DELETE /api/po-line-items?po_id=xxx - Delete all line items for a PO
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const po_id = searchParams.get('po_id')

    if (!po_id) {
      return NextResponse.json(
        { error: 'PO ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify the PO belongs to the current user
    // @ts-ignore - Supabase types don't recognize purchase_orders table
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('id', po_id)
      .eq('user_id', currentUser.id)
      .single()

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Delete line items
    // @ts-ignore - Supabase types don't recognize po_line_items table
    const { error } = await supabase
      .from('po_line_items')
      .delete()
      .eq('po_id', po_id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting line items:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete line items' },
      { status: 500 }
    )
  }
}
