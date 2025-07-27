import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[Middleware] Processing path:', pathname);

  // Skip middleware for static files and other assets
  if (pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    console.log('[Middleware] Skipping static/api path:', pathname);
    return NextResponse.next();
  }

  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login', 
    '/register', 
    '/privacy', 
    '/terms', 
    '/feedback'
  ];
  
  // Check if current path is public
  const isPublicPath = publicPaths.some(path => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  });

  if (isPublicPath) {
    console.log('[Middleware] Allowing public path:', pathname);
    return NextResponse.next();
  }

  try {
    // For protected paths, check authentication
    const token = request.cookies.get('auth-token')?.value;
    
    console.log('[Middleware] Protected path:', pathname, 'Auth token exists:', !!token);
    
    if (!token) {
      console.log('[Middleware] No auth token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log('[Middleware] Auth token found, allowing request to:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Only run middleware on page routes (not static files or API routes)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
