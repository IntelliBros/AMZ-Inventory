import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function migrateUsers() {
  console.log('🔍 Checking for users without teams...\n')

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')

    if (usersError) {
      throw usersError
    }

    if (!users || users.length === 0) {
      console.log('✅ No users found in database')
      return
    }

    console.log(`Found ${users.length} total users`)

    // Check which users don't have teams
    const usersWithoutTeams = []

    for (const user of users) {
      const { data: teamUsers } = await (supabase as any)
        .from('team_users')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!teamUsers || teamUsers.length === 0) {
        usersWithoutTeams.push(user)
      }
    }

    if (usersWithoutTeams.length === 0) {
      console.log('✅ All users already have teams!')
      return
    }

    console.log(`\n⚠️  Found ${usersWithoutTeams.length} users without teams:`)
    usersWithoutTeams.forEach(user => {
      console.log(`   - ${user.email}`)
    })

    console.log('\n🔨 Creating teams for these users...\n')

    // Create teams for users without them
    for (const user of usersWithoutTeams) {
      const teamName = user.email.split('@')[0] + "'s Team"

      console.log(`Creating team for ${user.email}...`)

      // Create team
      const { data: team, error: teamError } = await (supabase as any)
        .from('teams')
        .insert({
          name: teamName,
          owner_id: user.id
        })
        .select('id')
        .single()

      if (teamError) {
        console.error(`  ❌ Failed to create team: ${teamError.message}`)
        continue
      }

      // Add user to team
      const { error: teamUserError } = await (supabase as any)
        .from('team_users')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner'
        })

      if (teamUserError) {
        console.error(`  ❌ Failed to add user to team: ${teamUserError.message}`)
        // Try to clean up the team
        await supabase.from('teams').delete().eq('id', team.id)
        continue
      }

      console.log(`  ✅ Created team: "${teamName}"`)
    }

    console.log('\n✅ Migration completed successfully!')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
migrateUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
