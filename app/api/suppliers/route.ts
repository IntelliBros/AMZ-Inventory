import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    const currentUser = await getCurrentUser(token)

    console.log('Current user from token:', currentUser)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

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
      user_id: currentUser.id,
    }

    console.log('Supplier data to insert:', supplierData)

    // @ts-ignore - Supabase types don't recognize suppliers table
    const { data, error } = await supabase
      .from('suppliers')
      // @ts-ignore - Supabase types don't recognize suppliers table
      .insert([supplierData])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    return NextResponse.json({ supplier: data })
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
