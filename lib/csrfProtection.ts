/**
 * CSRF Protection utilities
 */

import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';

interface CSRFToken {
  token: string;
  expiresAt: number;
}

// In-memory token storage (in production, use Redis or database)
const csrfTokens = new Map<string, CSRFToken>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, token] of csrfTokens.entries()) {
    if (token.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a CSRF token for a session
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  csrfTokens.set(sessionId, {
    token,
    expiresAt
  });
  
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedToken = csrfTokens.get(sessionId);
  
  if (!storedToken) {
    return false;
  }
  
  if (storedToken.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return storedToken.token === token;
}

/**
 * Clear a CSRF token
 */
export function clearCSRFToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}

/**
 * CSRF middleware for API routes
 */
export function withCSRFProtection(handler: Function) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    // Skip CSRF check for GET requests and OPTIONS
    if (req.method === 'GET' || req.method === 'OPTIONS') {
      return handler(req, res);
    }
    
    // Skip CSRF check for authentication endpoints (they have their own protection)
    if (req.url?.includes('/api/auth/')) {
      return handler(req, res);
    }
    
    // Get session ID from auth token or create one
    const authToken = req.cookies['auth-token'];
    const sessionId = authToken ? crypto.createHash('sha256').update(authToken).digest('hex') : 'anonymous';
    
    // Get CSRF token from headers
    const csrfToken = req.headers['x-csrf-token'] as string;
    
    if (!csrfToken) {
      return res.status(403).json({
        error: 'CSRF token missing',
        message: 'CSRF token is required for this request'
      });
    }
    
    if (!validateCSRFToken(sessionId, csrfToken)) {
      return res.status(403).json({
        error: 'CSRF token invalid',
        message: 'CSRF token is invalid or expired'
      });
    }
    
    return handler(req, res);
  };
}

/**
 * Generate CSRF token endpoint
 */
export async function generateCSRFTokenHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const authToken = req.cookies['auth-token'];
  const sessionId = authToken ? crypto.createHash('sha256').update(authToken).digest('hex') : 'anonymous';
  
  const token = generateCSRFToken(sessionId);
  
  res.status(200).json({
    csrfToken: token,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  });
}

/**
 * Client-side CSRF token management
 */
export const clientCSRF = {
  /**
   * Get CSRF token from server
   */
  async getToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken;
      }
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }
    
    return null;
  },
  
  /**
   * Add CSRF token to request headers
   */
  async addTokenToHeaders(headers: Headers): Promise<void> {
    const token = await this.getToken();
    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  },
  
  /**
   * Create headers with CSRF token
   */
  async createHeaders(): Promise<Headers> {
    const headers = new Headers();
    await this.addTokenToHeaders(headers);
    return headers;
  }
};