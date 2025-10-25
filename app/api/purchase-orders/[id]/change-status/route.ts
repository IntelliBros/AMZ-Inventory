import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/purchase-orders/[id]/change-status - Handle PO status changes and inventory updates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params
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
    const { old_status, new_status } = body

    if (!old_status || !new_status || old_status === new_status) {
      return NextResponse.json({ success: true })
    }

    const supabase = createServerClient()

    // Verify PO belongs to current team and check permissions
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('po_number, team_id')
      .eq('id', poId)
      .single<{ po_number: string; team_id: string }>()

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (po.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Check write permission
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to change purchase order status' },
        { status: 403 }
      )
    }

    // Handle status transitions
    if (old_status === 'in_production' && new_status === 'in_storage') {
      // Move inventory from production to storage
      // @ts-ignore
      const { error } = await supabase
        .from('inventory_locations')
        // @ts-ignore
        .update({
          location_type: 'storage',
          // @ts-ignore
          notes: `PO ${po.po_number} Complete`
        })
        .eq('po_id', poId)
        .eq('location_type', 'production')

      if (error) throw error
    }

    if (old_status === 'in_storage' && new_status === 'in_production') {
      // Move inventory from storage back to production
      // @ts-ignore
      const { error } = await supabase
        .from('inventory_locations')
        // @ts-ignore
        .update({
          location_type: 'production',
          // @ts-ignore
          notes: `PO ${po.po_number} In Production`
        })
        .eq('po_id', poId)
        .eq('location_type', 'storage')

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error changing PO status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to change status' },
      { status: 500 }
    )
  }
}
