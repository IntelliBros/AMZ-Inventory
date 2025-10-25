import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// PATCH /api/warehouse-snapshots/[id] - Update a warehouse snapshot
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
    const { product_id, snapshot_date, quantity, notes } = body

    const supabase = createServerClient()

    // Verify the snapshot belongs to the current user and check permissions
    // @ts-ignore
    const { data: snapshot, error: snapshotError } = await supabase
      .from('warehouse_snapshots')
      .select('user_id')
      .eq('id', id)
      .single()

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'Warehouse snapshot not found' },
        { status: 404 }
      )
    }

    // Check write permission
    // @ts-ignore
    const canWrite = await hasWritePermission(currentUser.id, snapshot.user_id)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to edit warehouse snapshots' },
        { status: 403 }
      )
    }

    const snapshotData = {
      product_id,
      snapshot_date,
      quantity,
      notes: notes || null,
    }

    // Update snapshot
    // @ts-ignore
    const { data, error } = await supabase
      .from('warehouse_snapshots')
      // @ts-ignore
      .update(snapshotData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Recalculate sales for this snapshot (period ending with this snapshot)
    await calculateAndSaveSales(supabase, id, product_id, snapshot_date, quantity, currentUser.id)

    // Also recalculate sales for the NEXT snapshot (if it exists)
    // because changing this snapshot affects the next period's calculation
    // @ts-ignore
    const { data: nextSnapshot } = await supabase
      .from('warehouse_snapshots')
      .select('*')
      .eq('product_id', product_id)
      .gt('snapshot_date', snapshot_date)
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .single()

    if (nextSnapshot) {
      await calculateAndSaveSales(
        supabase,
        // @ts-ignore
        nextSnapshot.id,
        // @ts-ignore
        nextSnapshot.product_id,
        // @ts-ignore
        nextSnapshot.snapshot_date,
        // @ts-ignore
        nextSnapshot.quantity,
        currentUser.id
      )
    }

    return NextResponse.json({ snapshot: data })
  } catch (error: any) {
    console.error('Error updating warehouse snapshot:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update warehouse snapshot' },
      { status: 500 }
    )
  }
}

// DELETE /api/warehouse-snapshots/[id] - Delete a warehouse snapshot
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

    // Get snapshot details before deleting (need product_id and date for recalculation)
    // @ts-ignore
    const { data: snapshot, error: snapshotError } = await supabase
      .from('warehouse_snapshots')
      .select('user_id, product_id, snapshot_date')
      .eq('id', id)
      .single()

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'Warehouse snapshot not found' },
        { status: 404 }
      )
    }

    // Check write permission
    // @ts-ignore
    const canWrite = await hasWritePermission(currentUser.id, snapshot.user_id)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to delete warehouse snapshots' },
        { status: 403 }
      )
    }

    // @ts-ignore
    const productId = snapshot.product_id
    // @ts-ignore
    const snapshotDate = snapshot.snapshot_date

    // Delete any sales records associated with this snapshot
    // (where this snapshot is the ending snapshot)
    await supabase
      .from('sales_records')
      .delete()
      .eq('product_id', productId)
      .eq('end_date', snapshotDate)

    // Delete the snapshot
    // @ts-ignore
    const { error } = await supabase
      .from('warehouse_snapshots')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Recalculate sales for the NEXT snapshot (if it exists)
    // because deleting this snapshot means the next snapshot's calculation
    // will now use the previous snapshot as its starting point
    // @ts-ignore
    const { data: nextSnapshot } = await supabase
      .from('warehouse_snapshots')
      .select('*')
      .eq('product_id', productId)
      .gt('snapshot_date', snapshotDate)
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .single()

    if (nextSnapshot) {
      await calculateAndSaveSales(
        supabase,
        // @ts-ignore
        nextSnapshot.id,
        // @ts-ignore
        nextSnapshot.product_id,
        // @ts-ignore
        nextSnapshot.snapshot_date,
        // @ts-ignore
        nextSnapshot.quantity,
        currentUser.id
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting warehouse snapshot:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete warehouse snapshot' },
      { status: 500 }
    )
  }
}

async function calculateAndSaveSales(
  supabase: any,
  snapshotId: string,
  productId: string,
  currentDate: string,
  currentQuantity: number,
  userId: string
) {
  // Get previous snapshot for this product
  // @ts-ignore
  const { data: previousSnapshot } = await supabase
    .from('warehouse_snapshots')
    .select('*')
    .eq('product_id', productId)
    .lt('snapshot_date', currentDate)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (!previousSnapshot) {
    return
  }

  // @ts-ignore
  const { data: deliveredShipments } = await supabase
    .from('shipping_line_items')
    .select(`
      quantity,
      shipping_invoices!inner (
        status,
        shipping_date
      )
    `)
    .eq('product_id', productId)
    .eq('shipping_invoices.status', 'delivered')
    // @ts-ignore
    .gte('shipping_invoices.shipping_date', previousSnapshot.snapshot_date)
    .lte('shipping_invoices.shipping_date', currentDate)
  // @ts-ignore
  const unitsDeliveredInPeriod = deliveredShipments?.reduce((sum, item) => sum + item.quantity, 0) || 0

  // @ts-ignore
  const unitsSold = (previousSnapshot.quantity + unitsDeliveredInPeriod) - currentQuantity

  if (unitsSold >= 0) {
    const { data: existingSalesRecord } = await supabase
      .from('sales_records')
      .select('id')
      .eq('product_id', productId)
      // @ts-ignore
      .eq('start_date', previousSnapshot.snapshot_date)
      .eq('end_date', currentDate)
      .single()

    const salesData = {
      product_id: productId,
      // @ts-ignore
      start_date: previousSnapshot.snapshot_date,
      end_date: currentDate,
      units_sold: unitsSold,
      // @ts-ignore
      starting_inventory: previousSnapshot.quantity,
      ending_inventory: currentQuantity,
      units_received: unitsDeliveredInPeriod,
      user_id: userId,
    }

    if (existingSalesRecord) {
      await supabase
        .from('sales_records')
        // @ts-ignore
        .update(salesData)
        // @ts-ignore
        .eq('id', existingSalesRecord.id)
    } else {
      await supabase
        .from('sales_records')
        // @ts-ignore
        .insert([salesData])
    }
  }
}
