import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// POST /api/teams/switch - Switch to a different team
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
    const { team_id } = body

    if (!team_id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify user has access to this team
    const { data: teamUser, error } = await supabase
      .from('team_users')
      .select('*')
      .eq('team_id', team_id)
      .eq('user_id', currentUser.id)
      .single()

    if (error || !teamUser) {
      return NextResponse.json(
        { error: 'You do not have access to this team' },
        { status: 403 }
      )
    }

    // Set the current team in a cookie
    cookieStore.set('current-team-id', team_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return NextResponse.json({ success: true, team_id })
  } catch (error: any) {
    console.error('Error switching team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to switch team' },
      { status: 500 }
    )
  }
}
