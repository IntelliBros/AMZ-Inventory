import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { removeSalesFromInventory, checkInventoryAvailability } from '@/lib/fifo-inventory'

export const runtime = 'nodejs'

// GET /api/sales-snapshots - Get all sales snapshots for current team
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')

    const supabase = createServerClient()

    let query = supabase
      .from('sales_snapshots')
      .select(`
        *,
        products (
          id,
          sku,
          name,
          asin
        )
      `)
      .eq('team_id', currentTeamId)
      .order('period_start', { ascending: false })

    // Optional filters
    if (periodStart) {
      query = query.gte('period_start', periodStart)
    }
    if (periodEnd) {
      query = query.lte('period_end', periodEnd)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sales snapshots:', error)
      throw error
    }

    return NextResponse.json({ sales_snapshots: data })
  } catch (error: any) {
    console.error('Error in GET /api/sales-snapshots:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales snapshots' },
      { status: 500 }
    )
  }
}

// POST /api/sales-snapshots - Create new sales snapshot
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
        { error: 'You do not have permission to create sales snapshots' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      product_id,
      period_start,
      period_end,
      units_sold,
      revenue,
      notes
    } = body

    // Validate required fields
    if (!product_id || !period_start || !period_end || units_sold === undefined || revenue === undefined) {
      return NextResponse.json(
        { error: 'Product, period dates, units sold, and revenue are required' },
        { status: 400 }
      )
    }

    if (units_sold < 0 || revenue < 0) {
      return NextResponse.json(
        { error: 'Units sold and revenue must be non-negative' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify product belongs to current team
    const { data: product, error: productError } = await (supabase as any)
      .from('products')
      .select('team_id')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Product does not belong to your team' },
        { status: 403 }
      )
    }

    // Check for duplicate (same team, product, and period)
    const { data: existing } = await (supabase as any)
      .from('sales_snapshots')
      .select('id')
      .eq('team_id', currentTeamId)
      .eq('product_id', product_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A sales snapshot already exists for this product and period' },
        { status: 400 }
      )
    }

    // Check inventory availability before consuming
    const inventoryCheck = await checkInventoryAvailability(product_id, units_sold, currentTeamId)

    if (!inventoryCheck.available) {
      return NextResponse.json(
        {
          error: `Insufficient inventory. Available: ${inventoryCheck.totalQty} units (FBA: ${inventoryCheck.fbaQty}, Receiving: ${inventoryCheck.receivingQty}). Needed: ${units_sold} units.`
        },
        { status: 400 }
      )
    }

    // Remove inventory using FIFO
    const removalResult = await removeSalesFromInventory(
      product_id,
      units_sold,
      currentTeamId,
      period_start,
      period_end
    )

    if (!removalResult.success) {
      return NextResponse.json(
        { error: removalResult.error || 'Failed to remove inventory' },
        { status: 500 }
      )
    }

    // Create sales snapshot
    const snapshotData = {
      team_id: currentTeamId,
      product_id,
      period_start,
      period_end,
      units_sold,
      revenue: parseFloat(revenue.toString()),
      snapshot_date: new Date().toISOString().split('T')[0],
      notes: notes || null
    }

    const { data: snapshot, error: snapshotError } = await (supabase as any)
      .from('sales_snapshots')
      .insert(snapshotData)
      .select(`
        *,
        products (
          id,
          sku,
          name,
          asin
        )
      `)
      .single()

    if (snapshotError) {
      console.error('Error creating sales snapshot:', snapshotError)
      throw snapshotError
    }

    return NextResponse.json({
      sales_snapshot: snapshot,
      inventory_consumed: removalResult.consumed
    })
  } catch (error: any) {
    console.error('Error in POST /api/sales-snapshots:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create sales snapshot' },
      { status: 500 }
    )
  }
}
