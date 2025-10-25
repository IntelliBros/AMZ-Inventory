import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasWritePermission } from '@/lib/auth'
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

    const supabase = createServerClient()

    // Get inventory location with its product to check permissions
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory_locations')
      .select('product_id, products!inner(user_id)')
      .eq('id', id)
      .single<{ product_id: string; products: { user_id: string } }>()

    if (inventoryError || !inventory) {
      return NextResponse.json(
        { error: 'Inventory location not found' },
        { status: 404 }
      )
    }

    const canWrite = await hasWritePermission(currentUser.id, inventory.products.user_id)
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
