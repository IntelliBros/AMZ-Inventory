import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET /api/team - List all team members for the current team
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

    // Get current team ID from cookie
    const teamIdCookie = cookieStore.get('current-team-id')?.value
    const currentTeamId = await getCurrentTeamId(teamIdCookie, currentUser.id)

    if (!currentTeamId) {
      return NextResponse.json(
        { error: 'No team selected' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get all members of the current team
    const { data: teamMembers, error } = await supabase
      .from('team_users')
      .select(`
        *,
        member:users!team_users_user_id_fkey (
          id,
          email
        )
      `)
      .eq('team_id', currentTeamId)

    if (error) throw error

    return NextResponse.json({ teamMembers: teamMembers || [] })
  } catch (error: any) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

// POST /api/team - Add a new team member
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

    // Get current team ID from cookie
    const teamIdCookie = cookieStore.get('current-team-id')?.value
    const currentTeamId = await getCurrentTeamId(teamIdCookie, currentUser.id)

    if (!currentTeamId) {
      return NextResponse.json(
        { error: 'No team selected' },
        { status: 400 }
      )
    }

    const { memberEmail, role } = await request.json()

    if (!memberEmail || !role) {
      return NextResponse.json(
        { error: 'Member email and role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, editor, or viewer' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Find the user by email
    const { data: memberUser, error: findError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', memberEmail)
      .single<{ id: string; email: string }>()

    if (findError || !memberUser) {
      return NextResponse.json(
        { error: 'User with that email not found' },
        { status: 404 }
      )
    }

    // Cannot add yourself as a team member
    if (memberUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a team member' },
        { status: 400 }
      )
    }

    // Add team member to the current team
    const { data: teamMember, error: insertError } = await (supabase as any)
      .from('team_users')
      .insert([
        {
          team_id: currentTeamId,
          user_id: memberUser.id,
          role: role,
        },
      ])
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'This user is already a team member' },
          { status: 400 }
        )
      }
      throw insertError
    }

    return NextResponse.json({
      success: true,
      teamMember: {
        // @ts-ignore - Supabase types don't recognize team_members table
        ...teamMember,
        member: memberUser,
      },
    })
  } catch (error: any) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}
