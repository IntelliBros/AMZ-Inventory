import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET /api/teams - Get all teams the user has access to
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

    const supabase = createServerClient()

    // Get all teams where user is a member
    const { data: teamUsers, error } = await supabase
      .from('team_users')
      .select(`
        *,
        teams:team_id (
          id,
          name,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', currentUser.id)

    if (error) {
      throw error
    }

    // Format the response
    const teams = teamUsers?.map((tu: any) => ({
      id: tu.teams.id,
      name: tu.teams.name,
      owner_id: tu.teams.owner_id,
      role: tu.role,
      created_at: tu.teams.created_at,
    })) || []

    return NextResponse.json({ teams })
  } catch (error: any) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
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
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Create the team
    const teamData = {
      name: name.trim(),
      owner_id: currentUser.id,
    }

    const { data: team, error: teamError } = await (supabase as any)
      .from('teams')
      .insert(teamData)
      .select()
      .single()

    if (teamError) {
      throw teamError
    }

    // Add the user as owner in team_users
    const memberData = {
      team_id: team.id,
      user_id: currentUser.id,
      role: 'owner' as const,
    }

    const { error: memberError } = await (supabase as any)
      .from('team_users')
      .insert(memberData)

    if (memberError) {
      // Rollback: delete the team if adding member fails
      await supabase.from('teams').delete().eq('id', team.id)
      throw memberError
    }

    return NextResponse.json({ team })
  } catch (error: any) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create team' },
      { status: 500 }
    )
  }
}
