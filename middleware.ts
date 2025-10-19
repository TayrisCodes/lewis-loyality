import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Simplified token verification for middleware (Edge Runtime compatible)
function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// Routes that are public
const publicRoutes = ['/login', '/customer', '/customer-auth', '/'];

// API routes that don't require auth
const publicApiRoutes = [
  '/api/customer',
  '/api/v2/customer',
  '/api/visit/record',
  '/api/v2/visit',
  '/api/customer/check',
  '/api/customer/register',
  '/api/customer/scan',
  '/api/customer/validate-qr',
  '/api/customer/[phone]/rewards',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // TEMPORARILY DISABLED FOR DEBUGGING - ALLOW ALL ACCESS
  console.log(`[Middleware] ${request.method} ${pathname} - ALLOWED (middleware disabled)`);
  return NextResponse.next();
  
  /*
  // Check if it's a protected dashboard route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  
  // Check if it's a public API route
  const isPublicApiRoute = publicApiRoutes.some(route => {
    if (route.includes('[phone]')) {
      // Handle dynamic route pattern /api/customer/[phone]/rewards
      return pathname.match(/^\/api\/customer\/[^\/]+\/rewards$/);
    }
    return pathname.startsWith(route);
  });

  // If it's not a protected route or it's a public API route, allow access
  if (!isProtectedRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Get the auth token from cookies
  const token = request.cookies.get('auth-token')?.value;

  // If no token, redirect to login
  if (!token) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  // Verify the token
  const payload = verifyToken(token);
  
  // If token is invalid, redirect to login
  if (!payload) {
    const url = new URL('/login', request.url);
    const response = NextResponse.redirect(url);
    // Clear invalid cookie
    response.cookies.delete('auth-token');
    return response;
  }

  // Check role-based access for specific dashboard routes
  if (pathname.startsWith('/dashboard/super') && payload.role !== 'superadmin') {
    // Non-superadmin trying to access super admin dashboard
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/dashboard/admin') && payload.role !== 'admin' && payload.role !== 'superadmin') {
    // Non-admin trying to access admin dashboard (superadmin can access)
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  // Token is valid, allow access
  return NextResponse.next();
  */
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};


