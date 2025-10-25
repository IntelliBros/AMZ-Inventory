import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// PATCH /api/team/settings - Update team settings (team name)
export async function PATCH(request: NextRequest) {
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

    // Check write permissions (only owner/admin can rename team)
    const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
    if (!canWrite) {
      return NextResponse.json(
        { error: 'You do not have permission to update team settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { team_name } = body

    if (!team_name || team_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update the current team's name
    const { data, error } = await (supabase as any)
      .from('teams')
      .update({ name: team_name.trim() })
      .eq('id', currentTeamId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, team_name: data.name })
  } catch (error: any) {
    console.error('Error updating team settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update team settings' },
      { status: 500 }
    )
  }
}

// GET /api/team/settings - Get team settings
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

    // Get the current team's name
    const { data, error } = await supabase
      .from('teams')
      .select('name')
      .eq('id', currentTeamId)
      .single<{ name: string }>()

    if (error) throw error

    return NextResponse.json({ team_name: data?.name || 'Amazon FBA' })
  } catch (error: any) {
    console.error('Error fetching team settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team settings' },
      { status: 500 }
    )
  }
}
