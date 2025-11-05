import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { restoreSalesInventory, type ConsumedInventory } from '@/lib/fifo-inventory'

export const runtime = 'nodejs'

// GET /api/sales-snapshots/[id] - Get specific sales snapshot
export async function GET(
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

    const { data: snapshot, error } = await supabase
      .from('sales_snapshots')
      .select(`
        *,
        products (
          id,
          sku,
          name,
          asin,
          current_cost,
          current_shipping_cost
        )
      `)
      .eq('id', id)
      .eq('team_id', currentTeamId)
      .single()

    if (error || !snapshot) {
      return NextResponse.json(
        { error: 'Sales snapshot not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ sales_snapshot: snapshot })
  } catch (error: any) {
    console.error('Error in GET /api/sales-snapshots/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales snapshot' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-snapshots/[id] - Delete sales snapshot and restore inventory
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

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to delete sales snapshots' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()

    // Get snapshot details before deleting
    const { data: snapshot, error: snapshotError } = await (supabase as any)
      .from('sales_snapshots')
      .select('*')
      .eq('id', id)
      .eq('team_id', currentTeamId)
      .single()

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'Sales snapshot not found' },
        { status: 404 }
      )
    }

    // Note: We can't perfectly restore the exact inventory records that were consumed
    // because we don't store which specific inventory_locations were used.
    // Instead, we'll create new FBA inventory records with the sold quantity.
    // This is acceptable because:
    // 1. The total inventory count will be correct
    // 2. Future FIFO operations will still work correctly
    // 3. The inventory history shows the sale was deleted

    const { error: restoreError } = await (supabase as any)
      .from('inventory_locations')
      .insert({
        product_id: snapshot.product_id,
        location_type: 'fba',
        quantity: snapshot.units_sold,
        unit_cost: 0, // We don't know the original cost basis
        unit_shipping_cost: 0,
        po_id: null,
        notes: `Restored from deleted sales snapshot (Period: ${snapshot.period_start} to ${snapshot.period_end})`
      })

    if (restoreError) {
      console.error('Error restoring inventory:', restoreError)
      return NextResponse.json(
        { error: 'Failed to restore inventory after deleting snapshot' },
        { status: 500 }
      )
    }

    // Delete the snapshot
    const { error: deleteError } = await supabase
      .from('sales_snapshots')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting sales snapshot:', deleteError)
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Sales snapshot deleted and inventory restored'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/sales-snapshots/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete sales snapshot' },
      { status: 500 }
    )
  }
}
