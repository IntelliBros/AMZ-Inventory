import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// PATCH /api/products/[id] - Update a product
export async function PATCH(
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

    const supabase = createServerClient()

    // Check permissions first
    // @ts-ignore
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('id', id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // @ts-ignore
    const canWrite = await hasWritePermission(currentUser.id, product.user_id)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to update products' },
        { status: 403 }
      )
    }

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
    }

    // @ts-ignore - Supabase types don't recognize products table
    const { data, error } = await supabase
      .from('products')
      // @ts-ignore - Supabase types don't recognize products table
      .update(productData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete a product
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

    // @ts-ignore - Supabase types don't recognize products table
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}
