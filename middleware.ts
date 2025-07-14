import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that should bypass auth check
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth',
  '/terms',
  '/privacy',
  '/_next',
  '/icons',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js'
];

export async function middleware(request: NextRequest) {
  // Check if the path is public
  if (PUBLIC_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // For API routes, let them handle their own auth
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  
  // If no token is present and this is not an API route, redirect to login
  if (!token && !request.nextUrl.pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Only verify token for protected routes
    const stackAuthBaseUrl = process.env.NEXT_PUBLIC_STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
    const response = await fetch(`${stackAuthBaseUrl}/api/v1/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      // Clear invalid token and redirect to login
      const loginUrl = new URL('/login', request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete('auth-token');
      return redirectResponse;
    }

    // Token is valid, add user info to headers
    const data = await response.json();
    const nextResponse = NextResponse.next();
    
    if (data.user) {
      nextResponse.headers.set('x-user-id', data.user.id);
      nextResponse.headers.set('x-user-email', data.user.email || '');
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.next();
  }
}

// Specify which routes should be processed by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
