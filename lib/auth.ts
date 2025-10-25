import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { createClient } from '@/lib/supabase/client'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-to-a-random-string'
)

export interface JWTPayload {
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
export async function generateToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as JWTPayload
  } catch (error) {
    return null
  }
}

// Create user
export async function createUser(email: string, password: string): Promise<{ id: string; email: string }> {
  const supabase = createClient()
  const passwordHash = await hashPassword(password)

  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password_hash: passwordHash }])
    .select('id, email')
    .single()

  if (error) throw error
  return data as { id: string; email: string }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = createClient()

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
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Omit<User, 'password_hash' | 'updated_at'>
}
