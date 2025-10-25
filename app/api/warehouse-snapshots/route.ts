import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasWritePermission, isViewer } from '@/lib/auth'
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

    // Check if user is a viewer - viewers cannot create any resources
    const userIsViewer = await isViewer(currentUser.id)
    if (userIsViewer) {
      return NextResponse.json(
        { error: 'You do not have permission to create warehouse snapshots. Viewers have read-only access.' },
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

    // Check write permissions for the first product (all should belong to same owner)
    if (snapshots.length > 0) {
      // @ts-ignore
      const { data: product } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', snapshots[0].product_id)
        .single()

      if (product) {
        // @ts-ignore
        const canWrite = await hasWritePermission(currentUser.id, product.user_id)
        if (!canWrite) {
          return NextResponse.json(
            { error: 'You do not have permission to create warehouse snapshots' },
            { status: 403 }
          )
        }
      }
    }

    // Prepare snapshot data
    const snapshotDataArray = snapshots.map((snapshot: any) => ({
      product_id: snapshot.product_id,
      snapshot_date: snapshot.snapshot_date,
      quantity: snapshot.quantity,
      notes: snapshot.notes || null,
      user_id: currentUser.id,
    }))

    // @ts-ignore
    const { data: newSnapshots, error: insertError } = await supabase
      .from('warehouse_snapshots')
      // @ts-ignore
      .insert(snapshotDataArray)
      .select()

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
      // @ts-ignore
      for (const newSnapshot of newSnapshots) {
        await calculateAndSaveSales(
          supabase,
          // @ts-ignore
          newSnapshot.id,
          // @ts-ignore
          newSnapshot.product_id,
          // @ts-ignore
          newSnapshot.snapshot_date,
          // @ts-ignore
          newSnapshot.quantity,
          currentUser.id
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
    // No previous snapshot, can't calculate sales yet
    return
  }

  // Get the cumulative total_delivered at the time of the previous snapshot
  // We need to calculate how much was delivered BETWEEN the two snapshots
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

  // Calculate units sold between snapshots
  // Formula: units_sold = (previous_snapshot + units_delivered_in_period) - current_snapshot
  // @ts-ignore
  const unitsSold = (previousSnapshot.quantity + unitsDeliveredInPeriod) - currentQuantity

  // Only create sales record if units sold is positive or zero (allow zero for tracking)
  if (unitsSold >= 0) {
    // Check if sales record already exists for this period
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
      // Update existing record
      await supabase
        .from('sales_records')
        // @ts-ignore
        .update(salesData)
        // @ts-ignore
        .eq('id', existingSalesRecord.id)
    } else {
      // Create new record
      await supabase
        .from('sales_records')
        // @ts-ignore
        .insert([salesData])
    }
  }
}
