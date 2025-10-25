# JWT Authentication Setup Instructions

Your application has been successfully converted to use JWT authentication instead of Supabase Auth. Follow these steps to complete the setup:

## Step 1: Run SQL Migration in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `cfezevhujazrtlzhfvmu`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `sql/create_users_table.sql`
6. Click **Run** to execute the migration

The SQL migration will:
- Create a `users` table with email and password_hash columns
- Add an index on the email column for faster lookups
- Enable Row Level Security (RLS)
- Create a policy allowing full access via service role

## Step 2: Verify Environment Variables

Your `.env.local` file already has been updated with:
- `JWT_SECRET` - Used to sign and verify JWT tokens

Make sure to change the JWT_SECRET to a more secure random string before deploying to production.

## Step 3: Test Authentication Locally

1. Your dev server should already be running on http://localhost:3000
2. Navigate to http://localhost:3000/login (you'll be redirected here automatically)
3. Try signing up at http://localhost:3000/signup with:
   - Any valid email address
   - A password with at least 6 characters
4. You should be redirected to the home page after successful signup
5. Try logging out and logging back in

## Step 4: Deploy to Vercel

Once you've tested locally and confirmed authentication works:

1. Add the `JWT_SECRET` environment variable to Vercel:
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Environment Variables**
   - Add `JWT_SECRET` with a secure random value (different from local)

2. Redeploy your application:
   ```bash
   vercel --prod
   ```

## What Changed

### Authentication Flow
- **Before**: Used Supabase Auth with `auth.signInWithPassword()` and `auth.signUp()`
- **After**: Custom JWT authentication with HTTP-only cookies

### Files Modified
1. `lib/auth.ts` - New authentication utilities
2. `app/api/auth/signup/route.ts` - New signup endpoint
3. `app/api/auth/login/route.ts` - New login endpoint
4. `app/api/auth/logout/route.ts` - New logout endpoint
5. `app/api/auth/me/route.ts` - New endpoint to get current user
6. `app/login/page.tsx` - Updated to use `/api/auth/login`
7. `app/signup/page.tsx` - Updated to use `/api/auth/signup`
8. `middleware.ts` - Updated to verify JWT tokens
9. `.env.local` - Added JWT_SECRET

### Security Features
- Passwords are hashed using bcryptjs (10 rounds)
- JWT tokens expire after 7 days
- Tokens are stored in HTTP-only cookies (not accessible via JavaScript)
- Cookies use `sameSite: 'lax'` to prevent CSRF attacks
- Cookies are only sent over HTTPS in production
- Middleware protects all routes except `/login` and `/signup`

## Next Steps: Update Data Queries

All your existing database queries currently work because they're using the Supabase client. However, you'll eventually want to add user-specific data filtering. For example:

```typescript
// Example: Filter products by user_id
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', userId) // Add this once you add user_id to tables
```

You can get the current user's ID in server components or API routes by:

```typescript
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const cookieStore = await cookies()
const token = cookieStore.get('auth-token')?.value
const payload = verifyToken(token)
const userId = payload?.userId
```

## Troubleshooting

### Issue: "Not authenticated" error
- Make sure you've run the SQL migration in Supabase
- Clear your browser cookies and try signing up again
- Check the browser console for error messages

### Issue: "Failed to create account"
- Check the dev server logs for errors
- Ensure the users table was created successfully in Supabase
- Verify the Supabase URL and anon key in `.env.local` are correct

### Issue: Middleware redirect loop
- Make sure `/login` and `/signup` are in the `publicRoutes` array in `middleware.ts`
- Clear browser cache and cookies
