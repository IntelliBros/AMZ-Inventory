import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isViewer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/purchase-orders - Create a new purchase order
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

    // Check if user is a viewer - viewers cannot create any resources
    const userIsViewer = await isViewer(currentUser.id)
    if (userIsViewer) {
      return NextResponse.json(
        { error: 'You do not have permission to create purchase orders. Viewers have read-only access.' },
        { status: 403 }
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

    if (!po_number || !supplier_id) {
      return NextResponse.json(
        { error: 'PO number and supplier are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const poData = {
      po_number,
      supplier: supplier_id, // Column is named 'supplier' not 'supplier_id'
      order_date: order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: expected_delivery_date || null,
      status: status || 'in_production',
      total_product_cost: total_product_cost || 0,
      notes: notes || null,
      user_id: currentUser.id,
    }

    // @ts-ignore - Supabase types don't recognize purchase_orders table
    const { data, error } = await supabase
      .from('purchase_orders')
      // @ts-ignore - Supabase types don't recognize purchase_orders table
      .insert([poData])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ purchase_order: data })
  } catch (error: any) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
