import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Create a secure CSP header with nonce
 */
export function createCSPHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' https://vercel.live`,
    `style-src 'self' 'strict-dynamic' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openai.com https://*.googleapis.com https://*.vercel.app https://fonts.gstatic.com https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
}

/**
 * CSP middleware that generates nonces and applies secure headers
 */
export function withCSP(handler: Function) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    const nonce = generateNonce();
    
    // Set CSP header with nonce
    res.setHeader('Content-Security-Policy', createCSPHeader(nonce));
    
    // Add nonce to response headers for client-side access
    res.setHeader('X-CSP-Nonce', nonce);
    
    // Add other security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    return handler(req, res);
  };
}

/**
 * Get nonce from request headers (for client-side use)
 */
export function getNonceFromRequest(req: NextApiRequest): string {
  return req.headers['x-csp-nonce'] as string || '';
}