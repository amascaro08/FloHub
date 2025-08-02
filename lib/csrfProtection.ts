/**
 * CSRF Protection using Double-Submit Cookie Pattern
 */

import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface CSRFConfig {
  cookieName?: string;
  headerName?: string;
  secret?: string;
}

const DEFAULT_CONFIG: Required<CSRFConfig> = {
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token',
  secret: process.env.CSRF_SECRET || process.env.JWT_SECRET || 'default-csrf-secret'
};

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(secret: string): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, cookieToken: string): boolean {
  if (!token || !cookieToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(cookieToken, 'hex')
  );
}

/**
 * CSRF Protection Middleware
 */
export function withCSRFProtection(config: CSRFConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return function(handler: Function) {
    return async function(req: NextApiRequest, res: NextApiResponse) {
      // Skip CSRF protection for GET requests
      if (req.method === 'GET') {
        return handler(req, res);
      }
      
      // For write operations (POST, PUT, DELETE, PATCH)
      const csrfToken = req.headers[finalConfig.headerName.toLowerCase()] as string;
      const cookieToken = req.cookies[finalConfig.cookieName];
      
      if (!csrfToken || !cookieToken) {
        return res.status(403).json({
          error: 'CSRF token missing',
          message: 'CSRF protection: Token not provided'
        });
      }
      
      if (!verifyCSRFToken(csrfToken, cookieToken)) {
        return res.status(403).json({
          error: 'CSRF token invalid',
          message: 'CSRF protection: Token validation failed'
        });
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Set CSRF token cookie
 */
export function setCSRFToken(res: NextApiResponse, config: CSRFConfig = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const token = generateCSRFToken(finalConfig.secret);
  
  // Set secure cookie with CSRF token
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  };
  
  res.setHeader('Set-Cookie', `${finalConfig.cookieName}=${token}; HttpOnly; ${cookieOptions.secure ? 'Secure;' : ''} SameSite=Strict; Max-Age=${cookieOptions.maxAge}; Path=${cookieOptions.path}`);
  
  return token;
}

/**
 * Get CSRF token for client-side use
 */
export function getCSRFToken(req: NextApiRequest, config: CSRFConfig = {}): string | null {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  return req.cookies[finalConfig.cookieName] || null;
}

/**
 * Middleware to set CSRF token on GET requests
 */
export function withCSRFToken(config: CSRFConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return function(handler: Function) {
    return async function(req: NextApiRequest, res: NextApiResponse) {
      // Set CSRF token for GET requests
      if (req.method === 'GET') {
        setCSRFToken(res, finalConfig);
      }
      
      return handler(req, res);
    };
  };
}