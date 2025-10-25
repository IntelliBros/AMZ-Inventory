# Multi-Team System Migration Guide

This guide explains the multi-team system refactoring and provides instructions for completing the migration.

## Overview

The system has been refactored to support multiple teams per user. Each user can create multiple teams and switch between them. All data (products, POs, suppliers, etc.) is now scoped to teams rather than individual users.

## Database Changes

### New Tables
1. **teams** - Stores team information
   - id, name, owner_id, created_at, updated_at

2. **team_users** - Junction table linking users to teams
   - id, team_id, user_id, role, created_at
   - Roles: owner, admin, editor, viewer, member

### Modified Tables
All data tables now have a `team_id` column:
- products
- suppliers
- purchase_orders
- shipping_invoices
- warehouse_snapshots
- sales_records

## Migration Steps

### Step 1: Run Database Migration

Execute the SQL migration file in Supabase SQL Editor:
`supabase/migrations/20251026_create_teams_system.sql`

This will:
- Create teams and team_users tables
- Add team_id columns to all data tables
- Migrate existing data (create default team for each user)
- Set up indexes and permissions

### Step 2: Test the Migration

After running the migration, verify:
```sql
-- Check teams were created
SELECT * FROM teams;

-- Check team_users were created
SELECT * FROM team_users;

-- Check products have team_id
SELECT id, name, team_id FROM products LIMIT 10;
```

### Step 3: Update API Routes

Each API route that creates or queries data needs to be updated to use `team_id` instead of `user_id`.

#### Pattern for GET/LIST endpoints:

```typescript
import { getCurrentUser, getCurrentTeamId } from '@/lib/auth'

// Inside the route handler:
const cookieStore = await cookies()
const token = cookieStore.get('auth-token')?.value
const currentUser = await getCurrentUser(token)

if (!currentUser) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}

// Get current team
const cookieTeamId = cookieStore.get('current-team-id')?.value
const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

if (!currentTeamId) {
  return NextResponse.json({ error: 'No team selected' }, { status: 400 })
}

// Query data filtered by team_id
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('team_id', currentTeamId)
```

#### Pattern for POST/CREATE endpoints:

```typescript
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'

// Inside the route handler:
const cookieStore = await cookies()
const token = cookieStore.get('auth-token')?.value
const currentUser = await getCurrentUser(token)

if (!currentUser) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}

// Get current team
const cookieTeamId = cookieStore.get('current-team-id')?.value
const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

if (!currentTeamId) {
  return NextResponse.json({ error: 'No team selected' }, { status: 400 })
}

// Check write permissions
const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
if (!canWrite) {
  return NextResponse.json({ error: 'No write permission' }, { status: 403 })
}

// Create data with team_id
const { data } = await supabase
  .from('products')
  .insert({
    ...productData,
    user_id: currentUser.id,
    team_id: currentTeamId,
  })
```

#### Pattern for PATCH/DELETE endpoints:

```typescript
import { getCurrentUser, getCurrentTeamId, hasTeamWritePermission } from '@/lib/auth'

// Inside the route handler:
const cookieStore = await cookies()
const token = cookieStore.get('auth-token')?.value
const currentUser = await getCurrentUser(token)

if (!currentUser) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}

// Get current team
const cookieTeamId = cookieStore.get('current-team-id')?.value
const currentTeamId = await getCurrentTeamId(cookieTeamId, currentUser.id)

if (!currentTeamId) {
  return NextResponse.json({ error: 'No team selected' }, { status: 400 })
}

// Fetch the resource and verify team ownership
const { data: resource } = await supabase
  .from('products')
  .select('team_id')
  .eq('id', resourceId)
  .single()

if (!resource || resource.team_id !== currentTeamId) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// Check write permissions
const canWrite = await hasTeamWritePermission(currentUser.id, currentTeamId)
if (!canWrite) {
  return NextResponse.json({ error: 'No write permission' }, { status: 403 })
}

// Update/delete the resource
```

### Step 4: Routes That Need Updating

✅ = Completed
⏳ = In Progress
❌ = Not Started

**Core Data Routes:**
- ⏳ `/api/products/route.ts` - Partially done (POST only)
- ❌ `/api/products/[id]/route.ts` - PATCH, DELETE
- ❌ `/api/suppliers/route.ts` - POST
- ❌ `/api/suppliers/[id]/route.ts` - PATCH, DELETE
- ❌ `/api/purchase-orders/route.ts` - GET, POST
- ❌ `/api/purchase-orders/[id]/route.ts` - PATCH, DELETE
- ❌ `/api/purchase-orders/[id]/change-status/route.ts` - POST
- ❌ `/api/shipping-invoices/route.ts` - GET, POST
- ❌ `/api/shipping-invoices/[id]/route.ts` - PATCH, DELETE
- ❌ `/api/inventory-locations/route.ts` - GET, POST
- ❌ `/api/inventory-locations/[id]/route.ts` - DELETE
- ❌ `/api/warehouse-snapshots/route.ts` - GET, POST
- ❌ `/api/warehouse-snapshots/[id]/route.ts` - PATCH, DELETE
- ❌ `/api/po-line-items/route.ts` - POST, DELETE

**System Routes:**
- ❌ `/api/team/route.ts` - Needs refactoring to use new team system
- ❌ `/api/team/[id]/route.ts` - Needs refactoring
- ❌ `/api/team/settings/route.ts` - Needs to return current team name

**Page Components:**
All server-side data fetching in page.tsx files needs updating to filter by team_id:
- ❌ `app/page.tsx` - Dashboard
- ❌ `app/products/page.tsx`
- ❌ `app/suppliers/page.tsx`
- ❌ `app/purchase-orders/page.tsx`
- ❌ `app/shipping/page.tsx`
- ❌ `app/inventory/page.tsx`
- ❌ `app/inventory-history/page.tsx`
- ❌ `app/warehouse-snapshots/page.tsx`
- ❌ `app/sales/page.tsx`

### Step 5: Update Sidebar

The Sidebar needs to fetch the current team's name instead of the user's team_name field:

```typescript
const fetchTeamName = async () => {
  try {
    const response = await fetch('/api/teams/current', {
      credentials: 'include'
    })

    if (response.ok) {
      const { team_name } = await response.json()
      setTeamName(team_name || 'My Team')
      cacheTeamName(team_name)
    }
  } catch (err) {
    console.error('Error fetching team name:', err)
  }
}
```

Create `/api/teams/current/route.ts`:
```typescript
// Returns the current team info
export async function GET(request: NextRequest) {
  // Get current user and team ID
  // Return team name and info
}
```

### Step 6: Testing Checklist

After completing all updates, test:

1. **Team Creation**
   - [ ] Create a new team
   - [ ] Verify team appears in dropdown
   - [ ] Verify you can switch to it

2. **Team Switching**
   - [ ] Create data in Team A
   - [ ] Switch to Team B
   - [ ] Verify Team A's data is not visible
   - [ ] Create data in Team B
   - [ ] Switch back to Team A
   - [ ] Verify Team B's data is not visible

3. **Data Operations**
   - [ ] Create products
   - [ ] Create suppliers
   - [ ] Create purchase orders
   - [ ] Create shipping invoices
   - [ ] Update records
   - [ ] Delete records

4. **Permissions**
   - [ ] Verify team members see correct data
   - [ ] Verify role-based permissions work
   - [ ] Verify viewers cannot edit/delete

## New Auth Helper Functions

Added to `lib/auth.ts`:

```typescript
// Get current team ID from cookie or default
getCurrentTeamId(cookieTeamId: string | undefined, userId: string): Promise<string | null>

// Check if user has write permissions for a team
hasTeamWritePermission(userId: string, teamId: string): Promise<boolean>
```

## UI Components

### Header
- ✅ Team dropdown selector
- ✅ "Create New Team" button
- ✅ Team switching functionality

### Sidebar
- ⏳ Needs to display current team name (not user's team_name field)

## Notes

- The old `team_members` table is still present but should be replaced by the new `team_users` system
- The `user_id` column is kept on all tables for backwards compatibility but data is primarily scoped by `team_id`
- When creating new records, both `user_id` and `team_id` must be set
- Team owners can add other users to their teams via the team management interface

## Troubleshooting

**Issue: "No team selected" error**
- User needs at least one team
- Check that migration created default team for user
- Verify team_users entry exists

**Issue: Can't see data after switching teams**
- Expected behavior - data is scoped to teams
- Verify you're querying with correct team_id

**Issue: Migration fails**
- Check that all user_id foreign keys are valid
- Verify users table has entries for all referenced user_ids
