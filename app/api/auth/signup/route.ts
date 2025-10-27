import { NextRequest, NextResponse } from 'next/server'
import { createUser, generateToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('Signup attempt for email:', email)

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create user
    console.log('Creating user in database...')
    const user = await createUser(email, password)
    console.log('User created successfully:', { id: user.id, email: user.email })

    if (!user || !user.id) {
      console.error('User creation returned invalid data:', user)
      throw new Error('Failed to create user - invalid response')
    }

    // Create default team for new user
    const supabase = createServerClient()
    const teamName = email.split('@')[0] + "'s Team"

    console.log('Creating default team for user:', user.id)

    const { data: team, error: teamError } = await (supabase as any)
      .from('teams')
      .insert({
        name: teamName,
        owner_id: user.id
      })
      .select('id')
      .single()

    if (teamError || !team) {
      console.error('Failed to create team:', teamError)
      throw new Error('Failed to create default team')
    }

    // Add user to team as owner
    console.log('Adding user to team as owner')

    const { error: teamUserError } = await (supabase as any)
      .from('team_users')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner' as const
      })

    if (teamUserError) {
      console.error('Failed to add user to team:', teamUserError)
      throw new Error('Failed to add user to team')
    }

    // Generate JWT token
    const token = await generateToken({ userId: user.id, email: user.email })
    console.log('JWT token generated for user:', user.id)

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Set current team cookie
    cookieStore.set('current-team-id', team.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })

    console.log('Signup completed successfully for:', email)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email }
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}
