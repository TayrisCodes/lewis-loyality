import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Note: jsonwebtoken is not compatible with Edge Runtime
// Middleware only checks for cookie presence - actual token verification
// happens at the API route level (Node.js runtime) where jsonwebtoken works properly

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
  
  // Customer dashboard routes use localStorage (client-side auth), not cookies
  // Allow them to pass through - authentication is handled on the client side
  if (pathname.startsWith('/dashboard/customer')) {
    return NextResponse.next();
  }
  
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
    console.log('Middleware: No auth token found, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // In Edge Runtime, jsonwebtoken is not available
  // We only check for cookie presence here - actual token verification
  // and role-based access control happens at:
  // 1. API route level (using requireSuperAdmin/requireAdmin in lib/auth.ts)
  // 2. Page level (client-side checks via AuthUtils and API calls)
  // This allows the middleware to work in Edge Runtime while still protecting routes
  
  console.log('Middleware: Auth token found, allowing access - verification will happen at API/page level');
  return NextResponse.next();
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


