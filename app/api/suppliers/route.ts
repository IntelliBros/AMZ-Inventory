import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/suppliers - Create a new supplier
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

    // Check write permissions
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to create suppliers' },
        { status: 403 }
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
      team_id: currentTeamId,
    }

    // @ts-ignore - Supabase types don't recognize suppliers table
    const { data, error } = await supabase
      .from('suppliers')
      // @ts-ignore - Supabase types don't recognize suppliers table
      .insert([supplierData])
      .select()
      .single()

    if (error) {
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
