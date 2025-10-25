import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
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
    const { product_id, snapshot_date, quantity, notes } = body

    const supabase = createServerClient()

    // Check that snapshot belongs to current team
    const { data: snapshot, error: snapshotError } = await supabase
      .from('warehouse_snapshots')
      .select('team_id')
      .eq('id', id)
      .single<{ team_id: string }>()

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'Warehouse snapshot not found' },
        { status: 404 }
      )
    }

    if (snapshot.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Warehouse snapshot not found' },
        { status: 404 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to update warehouse snapshots' },
        { status: 403 }
      )
    }

    // Update snapshot
    const { data, error } = (await (supabase as any)
      .from('warehouse_snapshots')
      .update({
        product_id,
        snapshot_date,
        quantity,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single()) as { data: any; error: any }

    if (error) throw error

    // Recalculate sales for this snapshot (period ending with this snapshot)
    await calculateAndSaveSales(supabase, id, product_id, snapshot_date, quantity, currentUser.id, currentTeamId)

    // Also recalculate sales for the NEXT snapshot (if it exists)
    // because changing this snapshot affects the next period's calculation
    const { data: nextSnapshot } = await supabase
      .from('warehouse_snapshots')
      .select('*')
      .eq('product_id', product_id)
      .gt('snapshot_date', snapshot_date)
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .single<{
        id: string
        product_id: string
        snapshot_date: string
        quantity: number
      }>()

    if (nextSnapshot) {
      await calculateAndSaveSales(
        supabase,
        nextSnapshot.id,
        nextSnapshot.product_id,
        nextSnapshot.snapshot_date,
        nextSnapshot.quantity,
        currentUser.id,
        currentTeamId
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

    // Check that snapshot belongs to current team
    const { data: snapshot, error: snapshotError } = await supabase
      .from('warehouse_snapshots')
      .select('team_id, product_id, snapshot_date')
      .eq('id', id)
      .single<{ team_id: string; product_id: string; snapshot_date: string }>()

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'Warehouse snapshot not found' },
        { status: 404 }
      )
    }

    if (snapshot.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Warehouse snapshot not found' },
        { status: 404 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to delete warehouse snapshots' },
        { status: 403 }
      )
    }

    const productId = snapshot.product_id
    const snapshotDate = snapshot.snapshot_date

    // Delete any sales records associated with this snapshot
    // (where this snapshot is the ending snapshot)
    await supabase
      .from('sales_records')
      .delete()
      .eq('product_id', productId)
      .eq('end_date', snapshotDate)

    // Delete the snapshot
    const { error } = await supabase
      .from('warehouse_snapshots')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Recalculate sales for the NEXT snapshot (if it exists)
    // because deleting this snapshot means the next snapshot's calculation
    // will now use the previous snapshot as its starting point
    const { data: nextSnapshot } = await supabase
      .from('warehouse_snapshots')
      .select('*')
      .eq('product_id', productId)
      .gt('snapshot_date', snapshotDate)
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .single<{
        id: string
        product_id: string
        snapshot_date: string
        quantity: number
      }>()

    if (nextSnapshot) {
      await calculateAndSaveSales(
        supabase,
        nextSnapshot.id,
        nextSnapshot.product_id,
        nextSnapshot.snapshot_date,
        nextSnapshot.quantity,
        currentUser.id,
        currentTeamId
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
  userId: string,
  teamId: string
) {
  // Get previous snapshot for this product
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
    .gte('shipping_invoices.shipping_date', previousSnapshot.snapshot_date)
    .lte('shipping_invoices.shipping_date', currentDate)

  const unitsDeliveredInPeriod = deliveredShipments?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0

  const unitsSold = (previousSnapshot.quantity + unitsDeliveredInPeriod) - currentQuantity

  if (unitsSold >= 0) {
    const { data: existingSalesRecord } = await supabase
      .from('sales_records')
      .select('id')
      .eq('product_id', productId)
      .eq('start_date', previousSnapshot.snapshot_date)
      .eq('end_date', currentDate)
      .single()

    const salesData = {
      product_id: productId,
      start_date: previousSnapshot.snapshot_date,
      end_date: currentDate,
      units_sold: unitsSold,
      starting_inventory: previousSnapshot.quantity,
      ending_inventory: currentQuantity,
      units_received: unitsDeliveredInPeriod,
      user_id: userId,
      team_id: teamId,
    }

    if (existingSalesRecord) {
      await supabase
        .from('sales_records')
        .update(salesData)
        .eq('id', existingSalesRecord.id)
    } else {
      await supabase
        .from('sales_records')
        .insert([salesData])
    }
  }
}
