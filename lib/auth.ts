import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { createServerClient } from '@/lib/supabase/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-to-a-random-string'
)

export interface AuthJWTPayload {
  userId: string
  email: string
}

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
  updated_at?: string
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate JWT token
export async function generateToken(payload: AuthJWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

// Verify JWT token
export async function verifyToken(token: string): Promise<AuthJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AuthJWTPayload
  } catch (error) {
    return null
  }
}

// Create user
export async function createUser(email: string, password: string): Promise<{ id: string; email: string }> {
  const supabase = createServerClient()
  const passwordHash = await hashPassword(password)

  console.log('Attempting to insert user into database:', email)

  const { data, error } = await supabase
    .from('users')
    // @ts-expect-error - Supabase types don't recognize users table
    .insert([{ email, password_hash: passwordHash }])
    .select('id, email')
    .single()

  if (error) {
    console.error('Database insert error:', error)
    throw error
  }

  console.log('User inserted successfully, returned data:', data)

  // Verify the user actually exists by querying it back
  const { data: verifyData, error: verifyError } = await supabase
    .from('users')
    .select('id, email')
    // @ts-expect-error - Supabase types don't recognize users table
    .eq('id', data.id)
    .single()

  if (verifyError || !verifyData) {
    // @ts-ignore - data might be typed as never due to Supabase types
    console.error('CRITICAL: User was inserted but cannot be found!', { verifyError, userId: data?.id })
    throw new Error('User creation verification failed - user not found after insert')
  }

  console.log('User verified in database:', verifyData)

  return data as { id: string; email: string }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = createServerClient()

  // @ts-ignore - Supabase types don't recognize users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) return null
  return data as User
}

// Get user by ID
export async function getUserById(id: string): Promise<Omit<User, 'password_hash' | 'updated_at'> | null> {
  const supabase = createServerClient()

  // @ts-ignore - Supabase types don't recognize users table
  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Omit<User, 'password_hash' | 'updated_at'>
}

// Get current user from request cookies
export async function getCurrentUser(token: string | undefined): Promise<{ id: string; email: string } | null> {
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    id: payload.userId,
    email: payload.email
  }
}

// Get all user IDs the current user can access (own ID + team member access)
export async function getAccessibleUserIds(userId: string): Promise<string[]> {
  const supabase = createServerClient()

  // @ts-ignore - Supabase types don't recognize team_members table
  const { data: teamAccess, error } = await supabase
    .from('team_members')
    .select('owner_id')
    .eq('member_id', userId)

  if (error) {
    console.error('Error fetching team access:', error)
    return [userId] // Return just own ID if error
  }

  // Start with user's own ID
  const accessibleIds = [userId]

  // Add all owner IDs where this user is a team member
  if (teamAccess && teamAccess.length > 0) {
    accessibleIds.push(...teamAccess.map((t: any) => t.owner_id))
  }

  return accessibleIds
}

// Check if user has specific role for an owner account
export async function getUserRole(memberId: string, ownerId: string): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null> {
  // If checking own account, return 'owner'
  if (memberId === ownerId) return 'owner'

  const supabase = createServerClient()

  // @ts-ignore - Supabase types don't recognize team_members table
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('member_id', memberId)
    .eq('owner_id', ownerId)
    .single()

  if (error || !data) return null
  // @ts-ignore - Supabase types don't recognize team_members table
  return data.role as 'admin' | 'editor' | 'viewer'
}

// Check if user has write permissions for a resource owned by ownerId
export async function hasWritePermission(currentUserId: string, resourceOwnerId: string): Promise<boolean> {
  // If accessing own resources, always have write permission
  if (currentUserId === resourceOwnerId) return true

  // Check team member role
  const role = await getUserRole(currentUserId, resourceOwnerId)

  // Only 'owner', 'admin', and 'editor' have write permissions
  // 'viewer' only has read access
  return role === 'admin' || role === 'editor'
}

// Check if user is a viewer on ANY team (no write access anywhere except own resources)
export async function isViewer(userId: string): Promise<boolean> {
  const supabase = createServerClient()

  // Check if user has any team memberships
  // @ts-ignore
  const { data: memberships } = await supabase
    .from('team_members')
    .select('role')
    .eq('member_id', userId)

  if (!memberships || memberships.length === 0) {
    // Not a team member, so they can write to their own resources
    return false
  }

  // If ALL memberships are 'viewer', then they're a viewer-only user
  // @ts-ignore
  return memberships.every(m => m.role === 'viewer')
}

// Get current team ID from cookie, or default to user's first team
export async function getCurrentTeamId(cookieTeamId: string | undefined, userId: string): Promise<string | null> {
  const supabase = createServerClient()

  // If cookie has a team ID, verify user has access to it
  if (cookieTeamId) {
    const { data: teamUser } = await supabase
      .from('team_users')
      .select('team_id')
      .eq('team_id', cookieTeamId)
      .eq('user_id', userId)
      .single()

    if (teamUser) {
      return cookieTeamId
    }
  }

  // Otherwise, get user's first team (default)
  const { data: teamUser } = await supabase
    .from('team_users')
    .select('team_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single<{ team_id: string }>()

  return teamUser?.team_id || null
}

// Check if user has write permissions for a team
export async function hasTeamWritePermission(userId: string, teamId: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data: teamUser } = await supabase
    .from('team_users')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single<{ role: string }>()

  if (!teamUser) return false

  // Owner, admin, and editor have write permissions
  return teamUser.role === 'owner' || teamUser.role === 'admin' || teamUser.role === 'editor'
}

