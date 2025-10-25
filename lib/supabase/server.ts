import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export function createServerClient() {
  // Always create a fresh client (no caching)
  // Use service role key for server-side operations (bypasses RLS)
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  return client
}

// Export as createClient for backward compatibility
export const createClient = createServerClient
