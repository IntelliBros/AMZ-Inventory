import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// PATCH /api/suppliers/[id] - Update a supplier
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { name, contact_person, email, phone, address, notes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const supplierData = {
      name,
      contact_person: contact_person || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
    }

    // @ts-ignore - Supabase types don't recognize suppliers table
    const { data, error } = await supabase
      .from('suppliers')
      // @ts-ignore - Supabase types don't recognize suppliers table
      .update(supplierData)
      .eq('id', id)
      .eq('user_id', currentUser.id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Supplier not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ supplier: data })
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Delete a supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const supabase = createServerClient()

    // @ts-ignore - Supabase types don't recognize suppliers table
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}
