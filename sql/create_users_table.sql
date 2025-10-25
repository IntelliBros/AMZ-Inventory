-- Create users table for JWT authentication
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- Enable RLS (but we'll manage auth via JWT, not Supabase auth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role has full access" ON public.users
  FOR ALL
  USING (true);

COMMENT ON TABLE public.users IS 'User accounts for JWT authentication';
