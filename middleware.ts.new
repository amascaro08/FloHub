import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip middleware for public paths
  const publicPaths = ['/login', '/register', '/api/auth'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  try {
    // Get the JWT token from the request cookies
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify the token
    const response = await fetch('https://api.stack-auth.com/api/v1/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const data = await response.json();
    
    // Add user info to request headers
    if (data.user) {
      response.headers.set('x-user-id', data.user.id);
      response.headers.set('x-user-email', data.user.primaryEmail || '');
    }
    
    return response;
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
