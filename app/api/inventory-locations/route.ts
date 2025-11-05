import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET /api/inventory-locations - Get inventory locations
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
    const locationType = searchParams.get('location_type')
    const productId = searchParams.get('product_id')

    const supabase = createServerClient()

    // Get all products that belong to current team
    const { data: accessibleProducts } = await (supabase as any)
      .from('products')
      .select('id')
      .eq('team_id', currentTeamId)

    const productIds = accessibleProducts?.map((p: any) => p.id) || []

    // Build query - filter by accessible products
    let query = supabase
      .from('inventory_locations')
      .select('*, products(id, sku, name, asin)')
      .in('product_id', productIds)

    if (locationType) {
      query = query.eq('location_type', locationType)
    }

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ locations: data })
  } catch (error: any) {
    console.error('Error fetching inventory locations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory locations' },
      { status: 500 }
    )
  }
}

// POST /api/inventory-locations - Create inventory locations
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

    const body = await request.json()
    const { locations } = body

    if (!locations || !Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'Locations array is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify all product_ids belong to current team
    const productIds = [...new Set(locations.map((loc: any) => loc.product_id))]
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, team_id')
      .in('id', productIds)

    if (productError) {
      throw productError
    }

    // Check if all products belong to current team
    const invalidProducts = products?.filter((p: any) => p.team_id !== currentTeamId)
    if (invalidProducts && invalidProducts.length > 0) {
      return NextResponse.json(
        { error: 'One or more products do not belong to your team' },
        { status: 403 }
      )
    }

    // Check write permissions
    const { hasTeamWritePermission } = await import('@/lib/auth')
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to create inventory locations' },
        { status: 403 }
      )
    }

    const { data, error } = await (supabase as any)
      .from('inventory_locations')
      .insert(locations)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ locations: data })
  } catch (error: any) {
    console.error('Error creating inventory locations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create inventory locations' },
      { status: 500 }
    )
  }
}
