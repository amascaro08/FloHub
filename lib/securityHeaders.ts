/**
 * Security headers utilities
 */

import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Add security headers to API responses
 */
export function addSecurityHeaders(res: NextApiResponse): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openai.com https://*.googleapis.com https://*.vercel.app https://fonts.gstatic.com https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

/**
 * Security middleware for API routes
 */
export function withSecurityHeaders(handler: Function) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    addSecurityHeaders(res);
    return handler(req, res);
  };
}

/**
 * Validate and sanitize request origin
 */
export function validateOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) {
    return false;
  }
  
  const allowedOrigins = [
    'https://flohub.xyz',
    'https://www.flohub.xyz',
    'https://flohub.vercel.app',
    'http://localhost:3000'
  ];
  
  return allowedOrigins.includes(origin);
}

/**
 * Add CORS headers with security considerations
 */
export function addCORSHeaders(req: NextApiRequest, res: NextApiResponse): void {
  const origin = req.headers.origin;
  
  if (validateOrigin(req) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }
}

/**
 * Comprehensive security middleware
 */
export function withComprehensiveSecurity(handler: Function) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    // Add security headers
    addSecurityHeaders(res);
    
    // Add CORS headers
    addCORSHeaders(req, res);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}