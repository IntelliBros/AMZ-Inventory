# Migration Scripts

## User Team Migration

### Purpose
This migration creates teams for users who were created before automatic team creation was implemented. Any user without a team will cause a "No team access found" error when trying to access the application.

### Usage

Run the migration script:

```bash
npm run migrate:users
```

### What it does

1. Checks all users in the database
2. Identifies users without any team membership
3. Creates a default team for each user (named "{email_prefix}'s Team")
4. Adds the user to their new team as the owner

### Output Example

```
🔍 Checking for users without teams...

Found 6 total users

⚠️  Found 1 users without teams:
   - user@example.com

🔨 Creating teams for these users...

Creating team for user@example.com...
  ✅ Created team: "user's Team"

✅ Migration completed successfully!
```

### SQL Migration

Alternatively, you can run the SQL migration directly on your Supabase database:

```bash
psql $DATABASE_URL -f supabase/migrations/20251027_add_teams_for_existing_users.sql
```

Or execute it through the Supabase SQL Editor in the dashboard.

### Requirements

- Node.js and npm installed
- `.env.local` file with valid Supabase credentials:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Notes

- This migration is idempotent - it's safe to run multiple times
- It will only create teams for users who don't already have one
- Each user gets their own team as the owner
