import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface AuthPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

// Helper function to determine cookie domain based on request
const getCookieDomain = (req: NextApiRequest): string | undefined => {
  const host = req.headers.host;
  
  if (!host) return undefined;
  
  // For production domains, use the root domain for cross-subdomain support
  if (host.includes('flohub.xyz')) {
    return '.flohub.xyz'; // Allows cookies to work on both flohub.xyz and www.flohub.xyz
  }
  
  // For Vercel and localhost, don't set domain (browser will handle it)
  return undefined;
};

// Helper function to get secure flag based on environment
const getSecureFlag = (req: NextApiRequest): boolean => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  
  // Use secure cookies for HTTPS environments
  return protocol === 'https' || (host?.includes('vercel.app') ?? false) || (host?.includes('flohub.xyz') ?? false);
};

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { 
      algorithms: ['HS256'] 
    }) as AuthPayload;
    
    // Check if token is expired (jwt.verify should handle this, but double-check)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.warn('Token expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('JWT token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid JWT token:', error.message);
    } else {
      console.error('JWT verification error:', error);
    }
    return null;
  }
}

export function auth(req: NextApiRequest): AuthPayload | null {
  try {
    // Try to get token from multiple sources for flexibility
    let token = req.cookies['auth-token'];
    
    // Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    return verifyToken(token);
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
  domain?: string;
}

export function setCookie(
  res: any, 
  req: NextApiRequest, 
  name: string, 
  value: string, 
  options: Partial<CookieOptions> = {}
) {
  const domain = getCookieDomain(req);
  const secure = getSecureFlag(req);
  
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    ...options
  };

  // Only set domain if we have one (for cross-subdomain support)
  if (domain) {
    cookieOptions.domain = domain;
  }

  // Build cookie string manually for better control
  const cookieParts = [`${name}=${value}`];
  
  Object.entries(cookieOptions).forEach(([key, val]) => {
    if (key === 'domain' && val) {
      cookieParts.push(`Domain=${val}`);
    } else if (key === 'path') {
      cookieParts.push(`Path=${val}`);
    } else if (key === 'maxAge') {
      cookieParts.push(`Max-Age=${val}`);
    } else if (key === 'sameSite') {
      cookieParts.push(`SameSite=${val}`);
    } else if (key === 'secure' && val) {
      cookieParts.push('Secure');
    } else if (key === 'httpOnly' && val) {
      cookieParts.push('HttpOnly');
    }
  });

  const cookieString = cookieParts.join('; ');
  
  // Set the cookie
  res.setHeader('Set-Cookie', cookieString);
  
  console.log(`Cookie set: ${cookieString}`);
}

interface ClearCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
  expires: Date;
  domain?: string;
}

export function clearCookie(res: any, req: NextApiRequest, name: string) {
  const domain = getCookieDomain(req);
  
  const cookieOptions: ClearCookieOptions = {
    httpOnly: true,
    secure: getSecureFlag(req),
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
    expires: new Date(0) // Also set expires for compatibility
  };

  // Only set domain if we have one
  if (domain) {
    cookieOptions.domain = domain;
  }

  // Build cookie string for clearing
  const cookieParts = [`${name}=`];
  
  Object.entries(cookieOptions).forEach(([key, val]) => {
    if (key === 'domain' && val) {
      cookieParts.push(`Domain=${val}`);
    } else if (key === 'path') {
      cookieParts.push(`Path=${val}`);
    } else if (key === 'maxAge') {
      cookieParts.push(`Max-Age=${val}`);
    } else if (key === 'expires' && val instanceof Date) {
      cookieParts.push(`Expires=${val.toUTCString()}`);
    } else if (key === 'sameSite') {
      cookieParts.push(`SameSite=${val}`);
    } else if (key === 'secure' && val) {
      cookieParts.push('Secure');
    } else if (key === 'httpOnly' && val) {
      cookieParts.push('HttpOnly');
    }
  });

  const cookieString = cookieParts.join('; ');
  
  // Clear the cookie
  res.setHeader('Set-Cookie', cookieString);
  
  console.log(`Cookie cleared: ${cookieString}`);
}