import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[Middleware] Processing path:', pathname);

  // Skip middleware for static files and other assets.
  if (pathname.includes('.')) {
    console.log('[Middleware] Skipping static file:', pathname);
    return NextResponse.next();
  }

  // Allow root path to be public, bypassing all checks.
  if (pathname === '/') {
    console.log('[Middleware] Allowing root path');
    return NextResponse.next();
  }

  // Skip middleware for other public paths.
  const publicPaths = ['/login', '/register', '/api/auth'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    // Get the JWT token from the request cookies
    const token = request.cookies.get('auth-token')?.value;
    
    console.log('[Middleware] Auth token exists:', !!token);
    
    if (!token) {
      console.log('[Middleware] No auth token, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // We don't need to verify the token here since the API routes will do it.
    // This middleware is just to protect the pages.
    
    console.log('[Middleware] Auth token found, allowing request');
    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configure paths that require authentication
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes (login, register, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|login|register|api/auth).*)',
  ],
};
