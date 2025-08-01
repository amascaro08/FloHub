/**
 * Rate limiting utilities for API protection
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: any) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    // SECURITY FIX: Use Array.from() for compatibility with older TypeScript targets
    Array.from(this.requests.entries()).forEach(([key, entry]) => {
      if (entry.resetTime < now) {
        this.requests.delete(key);
      }
    });
  }

  private getKey(req: any, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation based on IP and user agent
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    return `${ip}:${userAgent}`;
  }

  checkLimit(req: any, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const key = this.getKey(req, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const entry = this.requests.get(key);
    
    if (!entry || entry.resetTime < now) {
      // No existing entry or expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    // Increment count
    entry.count++;
    this.requests.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  // Clean up resources
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints - very strict
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (req: any) => {
      const ip = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection?.remoteAddress || 
                 'unknown';
      return `auth:${ip}`;
    }
  },
  
  // API endpoints - moderate
  API: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (req: any) => {
      const ip = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection?.remoteAddress || 
                 'unknown';
      return `api:${ip}`;
    }
  },
  
  // User-specific endpoints - per user
  USER: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (req: any) => {
      const ip = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection?.remoteAddress || 
                 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      return `user:${ip}:${userAgent}`;
    }
  }
};

// Rate limiting middleware for Next.js API routes
export function withRateLimit(config: RateLimitConfig) {
  return function(handler: Function) {
    return async function(req: any, res: any) {
      const result = rateLimiter.checkLimit(req, config);
      
      if (!result.allowed) {
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter);
        }
        
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter
        });
      }
      
      // Add rate limit headers to successful responses
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      
      return handler(req, res);
    };
  };
}

// Cleanup on process exit
process.on('exit', () => {
  rateLimiter.destroy();
});

export default rateLimiter;