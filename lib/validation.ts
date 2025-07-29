/**
 * Centralized input validation utilities for security
 */

// Email validation with security considerations
export function validateEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, sanitized: '', error: 'Email is required' };
  }

  // Sanitize input
  const sanitized = email.trim().toLowerCase();
  
  // Length validation (prevent extremely long inputs)
  if (sanitized.length > 254) {
    return { isValid: false, sanitized, error: 'Email is too long' };
  }

  // Basic email regex (RFC 5322 compliant)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid email format' };
  }

  return { isValid: true, sanitized };
}

// Password validation with security requirements
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Check for basic complexity (at least one letter and one number/symbol)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasLetter || !hasNumberOrSymbol) {
    return { isValid: false, error: 'Password must contain at least one letter and one number or symbol' };
  }

  return { isValid: true };
}

// Sanitize text input to prevent XSS
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

// Validate and sanitize user IDs
export function validateUserId(id: any): { isValid: boolean; id: number; error?: string } {
  const numId = parseInt(id, 10);
  
  if (isNaN(numId) || numId <= 0) {
    return { isValid: false, id: 0, error: 'Invalid user ID' };
  }

  return { isValid: true, id: numId };
}

// Validate URL inputs to prevent SSRF
export function validateUrl(url: string, allowedProtocols = ['http:', 'https:']): { isValid: boolean; sanitized: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, sanitized: '', error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return { isValid: false, sanitized: url, error: 'Invalid protocol' };
    }

    // Prevent localhost and private IP access in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      
      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return { isValid: false, sanitized: url, error: 'Localhost URLs not allowed' };
      }

      // Block private IP ranges
      if (hostname.match(/^10\./) || hostname.match(/^192\.168\./) || hostname.match(/^172\.1[6-9]\./) || hostname.match(/^172\.2[0-9]\./) || hostname.match(/^172\.3[0-1]\./)) {
        return { isValid: false, sanitized: url, error: 'Private IP addresses not allowed' };
      }
    }

    return { isValid: true, sanitized: url };
  } catch (error) {
    return { isValid: false, sanitized: url, error: 'Invalid URL format' };
  }
}

// Rate limiting helper
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return function rateLimit(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this identifier
    const existingRequests = requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = existingRequests.filter(time => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    requests.set(identifier, recentRequests);

    return true;
  };
}

// Validate JWT token format without verifying
export function validateTokenFormat(token: string): { isValid: boolean; error?: string } {
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: 'Token is required' };
  }

  // JWT should have exactly 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { isValid: false, error: 'Invalid token format' };
  }

  // Each part should be base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  for (const part of parts) {
    if (!base64UrlRegex.test(part)) {
      return { isValid: false, error: 'Invalid token encoding' };
    }
  }

  return { isValid: true };
}