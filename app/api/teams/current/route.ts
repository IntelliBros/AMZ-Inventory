import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET /api/teams/current - Get current team info
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

    const supabase = createServerClient()

    // Get team info
    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name, owner_id, created_at')
      .eq('id', currentTeamId)
      .single()

    if (error || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ team })
  } catch (error: any) {
    console.error('Error fetching current team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch current team' },
      { status: 500 }
    )
  }
}
