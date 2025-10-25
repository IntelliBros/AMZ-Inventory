import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

let serverClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createServerClient() {
  if (serverClient) return serverClient

  // Use service role key for server-side operations (bypasses RLS)
  serverClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return serverClient
}
