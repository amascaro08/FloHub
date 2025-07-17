import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and other assets.
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow root path to be public, bypassing all checks.
  if (pathname === '/') {
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
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // We don't need to verify the token here since the API routes will do it.
    // This middleware is just to protect the pages.
    
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
