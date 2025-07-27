import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface AuthPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

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
    
    return decoded;
  } catch (error) {
    console.warn('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export function auth(req: NextApiRequest): AuthPayload | null {
  try {
    // Try to get token from cookie first
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

// Helper to determine if we need secure cookies
function isSecureEnvironment(req?: NextApiRequest): boolean {
  if (req) {
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'];
    
    // Check if it's HTTPS or a production domain
    return protocol === 'https' || 
           (host?.includes('flohub.xyz') ?? false) || 
           (host?.includes('vercel.app') ?? false);
  }
  
  // Default to secure in production
  return process.env.NODE_ENV === 'production';
}

// Enhanced cookie setting function with security awareness
export function setCookie(res: any, name: string, value: string, maxAge: number = 7 * 24 * 60 * 60, req?: NextApiRequest) {
  const isSecure = isSecureEnvironment(req);
  
  const cookieParts = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  
  // Add Secure flag for HTTPS environments
  if (isSecure) {
    cookieParts.push('Secure');
  }
  
  const cookieString = cookieParts.join('; ');
  res.setHeader('Set-Cookie', cookieString);
  
  console.log(`Cookie set (secure: ${isSecure}):`, cookieString);
}

// Enhanced cookie clearing function with security awareness  
export function clearCookie(res: any, name: string, req?: NextApiRequest) {
  const isSecure = isSecureEnvironment(req);
  
  const cookieParts = [
    `${name}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  
  // Add Secure flag for HTTPS environments
  if (isSecure) {
    cookieParts.push('Secure');
  }
  
  const cookieString = cookieParts.join('; ');
  res.setHeader('Set-Cookie', cookieString);
  
  console.log(`Cookie cleared (secure: ${isSecure}):`, cookieString);
}