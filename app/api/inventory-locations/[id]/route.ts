import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// DELETE /api/inventory-locations/[id] - Delete an inventory location
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

    // Get inventory location with its product to check permissions
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory_locations')
      .select('product_id, products!inner(team_id)')
      .eq('id', id)
      .single<{ product_id: string; products: { team_id: string } }>()

    if (inventoryError || !inventory) {
      return NextResponse.json(
        { error: 'Inventory location not found' },
        { status: 404 }
      )
    }

    // Verify product belongs to current team
    if (inventory.products.team_id !== currentTeamId) {
      return NextResponse.json(
        { error: 'Inventory location not found' },
        { status: 404 }
      )
    }

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this inventory location' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('inventory_locations')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting inventory location:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete inventory location' },
      { status: 500 }
    )
  }
}
