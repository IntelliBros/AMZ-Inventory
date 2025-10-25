import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isViewer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/products - Create a new product
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
        { error: 'You do not have permission to create products. Viewers have read-only access.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      sku,
      name,
      description,
      asin,
      fnsku,
      current_cost,
      current_shipping_cost,
      carton_length_cm,
      carton_width_cm,
      carton_height_cm,
      carton_weight_kg,
      units_per_carton,
    } = body

    if (!sku || !name) {
      return NextResponse.json(
        { error: 'SKU and name are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const productData = {
      sku,
      name,
      description: description || null,
      asin: asin || null,
      fnsku: fnsku || null,
      current_cost: current_cost || 0,
      current_shipping_cost: current_shipping_cost || 0,
      carton_length_cm: carton_length_cm || null,
      carton_width_cm: carton_width_cm || null,
      carton_height_cm: carton_height_cm || null,
      carton_weight_kg: carton_weight_kg || null,
      units_per_carton: units_per_carton || null,
      user_id: currentUser.id,
    }

    // @ts-ignore - Supabase types don't recognize products table
    const { data, error } = await supabase
      .from('products')
      // @ts-ignore - Supabase types don't recognize products table
      .insert([productData])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}
