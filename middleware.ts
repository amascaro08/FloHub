import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const host = request.headers.get('host');
    
    // Skip middleware entirely for static files, API routes, and Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.') ||
      pathname === '/favicon.ico' ||
      pathname === '/manifest.json' ||
      pathname.startsWith('/icons/') ||
      pathname.startsWith('/sw.js') ||
      pathname.startsWith('/workbox-')
    ) {
      return NextResponse.next();
    }

    // Public paths that should always be accessible
    const publicPaths = [
      '/',
      '/login',
      '/register', 
      '/privacy',
      '/terms',
      '/feedback'
    ];

    // Allow public paths without any authentication checks
    if (publicPaths.includes(pathname) || publicPaths.some(path => pathname.startsWith(path + '/'))) {
      return NextResponse.next();
    }

    // For all other paths, check if user has auth token
    const token = request.cookies.get('auth-token')?.value;
    
    // SECURITY FIX: Only log minimal debug info in development
    if (process.env.NODE_ENV === 'development' && pathname === '/dashboard') {
      console.log(`[Middleware] Dashboard access - Token present: ${!!token}`);
    }
    
    if (!token) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      
      return NextResponse.redirect(loginUrl);
    }

    // If token exists, allow the request (don't verify here to avoid JWT issues)
    return NextResponse.next();
  } catch (error) {
    // Log error but don't crash - allow request to proceed
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Use a very conservative matcher that only targets page routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (/api/*)
     * - static files (_next/static/*)
     * - image optimization (_next/image/*)
     * - favicon
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
};
