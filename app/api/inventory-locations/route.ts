import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getAccessibleUserIds } from '@/lib/auth'
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

    const { searchParams } = new URL(request.url)
    const locationType = searchParams.get('location_type')
    const productId = searchParams.get('product_id')

    const supabase = createServerClient()
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id)

    // Get all products that belong to accessible users
    // @ts-ignore
    const { data: accessibleProducts } = await supabase
      .from('products')
      .select('id')
      .in('user_id', accessibleUserIds)

    const productIds = accessibleProducts?.map((p: any) => p.id) || []

    // Build query - filter by accessible products
    let query = supabase
      .from('inventory_locations')
      .select('*, products(id, sku, name)')
      .in('product_id', productIds)

    if (locationType) {
      // @ts-ignore
      query = query.eq('location_type', locationType)
    }

    if (productId) {
      // @ts-ignore
      query = query.eq('product_id', productId)
    }

    // @ts-ignore
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

    const body = await request.json()
    const { locations } = body

    if (!locations || !Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'Locations array is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // @ts-ignore - Supabase types don't recognize inventory_locations table
    const { data, error } = await supabase
      .from('inventory_locations')
      // @ts-ignore - Supabase types don't recognize inventory_locations table
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
