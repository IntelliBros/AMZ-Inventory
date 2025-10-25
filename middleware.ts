import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-to-a-random-string'
)

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value

  console.log('Middleware - Path:', request.nextUrl.pathname, 'Has token:', !!token)

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // If it's a public route, allow access
  if (isPublicRoute) {
    console.log('Public route, allowing access')
    return NextResponse.next()
  }

  // If no token and trying to access protected route, redirect to login
  if (!token) {
    console.log('No token, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token using jose (works in edge runtime)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    console.log('Token valid, allowing access for user:', payload.email)
    return NextResponse.next()
  } catch (error) {
    console.log('Invalid token, redirecting to login:', error)
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
