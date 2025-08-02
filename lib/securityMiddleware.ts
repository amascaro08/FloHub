import { NextApiRequest, NextApiResponse } from 'next';
import { withCSP } from './cspMiddleware';
import { withCSRFProtection } from './csrfProtection';
import { withRateLimit, RATE_LIMITS } from './rateLimiter';
import { logger } from './logger';

/**
 * Comprehensive Security Middleware
 * Combines CSP, CSRF protection, rate limiting, and secure logging
 */

interface SecurityConfig {
  enableCSP?: boolean;
  enableCSRF?: boolean;
  enableRateLimit?: boolean;
  rateLimitConfig?: typeof RATE_LIMITS.API;
  enableLogging?: boolean;
}

const DEFAULT_CONFIG: Required<SecurityConfig> = {
  enableCSP: true,
  enableCSRF: true,
  enableRateLimit: true,
  rateLimitConfig: RATE_LIMITS.API,
  enableLogging: true
};

/**
 * Security middleware that combines all security features
 */
export function withSecurity(config: SecurityConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return function(handler: Function) {
    let wrappedHandler = handler;
    
    // Add logging
    if (finalConfig.enableLogging) {
      wrappedHandler = withLogging(wrappedHandler);
    }
    
    // Add rate limiting
    if (finalConfig.enableRateLimit) {
      wrappedHandler = withRateLimit(finalConfig.rateLimitConfig)(wrappedHandler);
    }
    
    // Add CSRF protection
    if (finalConfig.enableCSRF) {
      wrappedHandler = withCSRFProtection()(wrappedHandler);
    }
    
    // Add CSP headers
    if (finalConfig.enableCSP) {
      wrappedHandler = withCSP(wrappedHandler);
    }
    
    return wrappedHandler;
  };
}

/**
 * Logging middleware
 */
function withLogging(handler: Function) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Log request
    logger.info('API request started', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: getClientIP(req)
    });
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data: any) {
      const duration = Date.now() - startTime;
      
      logger.info('API request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        responseSize: JSON.stringify(data).length
      });
      
      return originalJson.call(this, data);
    };
    
    try {
      return await handler(req, res);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('API request failed', {
        requestId,
        method: req.method,
        url: req.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      throw error;
    }
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Get client IP address
 */
function getClientIP(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string) ||
         (req.headers['x-real-ip'] as string) ||
         (req.connection?.remoteAddress as string) ||
         'unknown';
}

/**
 * Predefined security configurations for different endpoint types
 */
export const SECURITY_CONFIGS = {
  // Authentication endpoints - strict security
  AUTH: {
    enableCSP: true,
    enableCSRF: false, // Auth endpoints have their own protection
    enableRateLimit: true,
    rateLimitConfig: RATE_LIMITS.AUTH,
    enableLogging: true
  },
  
  // API endpoints - standard security
  API: {
    enableCSP: true,
    enableCSRF: true,
    enableRateLimit: true,
    rateLimitConfig: RATE_LIMITS.API,
    enableLogging: true
  },
  
  // Assistant endpoints - moderate security
  ASSISTANT: {
    enableCSP: true,
    enableCSRF: true,
    enableRateLimit: true,
    rateLimitConfig: RATE_LIMITS.API,
    enableLogging: true
  },
  
  // Read-only endpoints - minimal security
  READ_ONLY: {
    enableCSP: true,
    enableCSRF: false,
    enableRateLimit: true,
    rateLimitConfig: RATE_LIMITS.API,
    enableLogging: true
  }
};

// Export convenience functions
export const withAuthSecurity = (handler: Function) => withSecurity(SECURITY_CONFIGS.AUTH)(handler);
export const withApiSecurity = (handler: Function) => withSecurity(SECURITY_CONFIGS.API)(handler);
export const withAssistantSecurity = (handler: Function) => withSecurity(SECURITY_CONFIGS.ASSISTANT)(handler);
export const withReadOnlySecurity = (handler: Function) => withSecurity(SECURITY_CONFIGS.READ_ONLY)(handler);