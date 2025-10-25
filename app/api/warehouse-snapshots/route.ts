import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/warehouse-snapshots - Create warehouse snapshot(s)
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
        { error: 'You do not have permission to create warehouse snapshots' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { snapshots } = body

    if (!snapshots || !Array.isArray(snapshots) || snapshots.length === 0) {
      return NextResponse.json(
        { error: 'Snapshots array is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify all products belong to the current team
    if (snapshots.length > 0) {
      const productIds = [...new Set(snapshots.map((s: any) => s.product_id))]
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, team_id')
        .in('id', productIds)

      if (productError) {
        throw productError
      }

      const invalidProduct = products?.find((p: any) => p.team_id !== currentTeamId)
      if (invalidProduct || products?.length !== productIds.length) {
        return NextResponse.json(
          { error: 'One or more products not found or do not belong to your team' },
          { status: 404 }
        )
      }
    }

    // Insert snapshots
    const { data: newSnapshots, error: insertError} = (await (supabase as any)
      .from('warehouse_snapshots')
      .insert(
        snapshots.map((snapshot: any) => ({
          product_id: snapshot.product_id,
          snapshot_date: snapshot.snapshot_date,
          quantity: snapshot.quantity,
          notes: snapshot.notes || null,
          user_id: currentUser.id,
          team_id: currentTeamId,
        }))
      )
      .select()) as { data: Array<{ id: string; product_id: string; snapshot_date: string; quantity: number }> | null; error: any }

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'One or more snapshots already exist for the selected date' },
          { status: 409 }
        )
      }
      throw insertError
    }

    // Calculate and save sales records for each snapshot
    if (newSnapshots) {
      for (const newSnapshot of newSnapshots) {
        await calculateAndSaveSales(
          supabase,
          newSnapshot.id,
          newSnapshot.product_id,
          newSnapshot.snapshot_date,
          newSnapshot.quantity,
          currentUser.id,
          currentTeamId
        )
      }
    }

    return NextResponse.json({ snapshots: newSnapshots })
  } catch (error: any) {
    console.error('Error creating warehouse snapshots:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create warehouse snapshots' },
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
    // No previous snapshot, can't calculate sales yet
    return
  }

  // Get the cumulative total_delivered at the time of the previous snapshot
  // We need to calculate how much was delivered BETWEEN the two snapshots
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

  // Calculate units sold between snapshots
  // Formula: units_sold = (previous_snapshot + units_delivered_in_period) - current_snapshot
  const unitsSold = (previousSnapshot.quantity + unitsDeliveredInPeriod) - currentQuantity

  // Only create sales record if units sold is positive or zero (allow zero for tracking)
  if (unitsSold >= 0) {
    // Check if sales record already exists for this period
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
      // Update existing record
      await supabase
        .from('sales_records')
        .update(salesData)
        .eq('id', existingSalesRecord.id)
    } else {
      // Create new record
      await supabase
        .from('sales_records')
        .insert([salesData])
    }
  }
}
