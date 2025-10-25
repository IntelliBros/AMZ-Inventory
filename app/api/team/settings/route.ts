import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
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

    const body = await request.json()
    const { team_name } = body

    if (!team_name || team_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update the user's team name
    // @ts-ignore
    const { data, error } = await supabase
      .from('users')
      // @ts-ignore
      .update({ team_name: team_name.trim() })
      .eq('id', currentUser.id)
      .select()
      .single()

    if (error) throw error

    // @ts-ignore
    return NextResponse.json({ success: true, team_name: data.team_name })
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

    const supabase = createServerClient()

    // Get the user's team name
    // @ts-ignore
    const { data, error } = await supabase
      .from('users')
      .select('team_name')
      .eq('id', currentUser.id)
      .single()

    if (error) throw error

    // @ts-ignore
    return NextResponse.json({ team_name: data?.team_name || 'Amazon FBA' })
  } catch (error: any) {
    console.error('Error fetching team settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team settings' },
      { status: 500 }
    )
  }
}
