/**
 * API Cache Layer for improved performance
 * Implements in-memory and session storage caching with TTL
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from URL and parameters
   */
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get data from cache (memory first, then session storage)
   */
  get(url: string, params?: Record<string, any>): any | null {
    const key = this.generateKey(url, params);
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data;
    }

    // Check session storage
    try {
      const sessionData = sessionStorage.getItem(`api_cache_${key}`);
      if (sessionData) {
        const entry: CacheEntry = JSON.parse(sessionData);
        if (this.isValid(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Remove expired entry
          sessionStorage.removeItem(`api_cache_${key}`);
        }
      }
    } catch (e) {
      // Session storage error, continue
    }

    return null;
  }

  /**
   * Set data in cache (both memory and session storage)
   */
  set(url: string, data: any, params?: Record<string, any>, ttl?: number): void {
    const key = this.generateKey(url, params);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);

    // Set in session storage (with error handling)
    try {
      sessionStorage.setItem(`api_cache_${key}`, JSON.stringify(entry));
    } catch (e) {
      // Session storage full or unavailable, continue with memory cache only
      console.warn('Session storage unavailable for caching');
    }
  }

  /**
   * Remove specific cache entry
   */
  remove(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.memoryCache.delete(key);
    
    try {
      sessionStorage.removeItem(`api_cache_${key}`);
    } catch (e) {
      // Session storage error, continue
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();
    
    try {
      // Clear session storage entries that start with our prefix
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('api_cache_')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (e) {
      // Session storage error, continue
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const apiCache = new ApiCache();

// Cached fetch function
export const cachedFetch = async (
  url: string, 
  options: RequestInit = {}, 
  cacheParams?: Record<string, any>,
  ttl?: number
): Promise<any> => {
  // Try cache first
  const cached = apiCache.get(url, cacheParams);
  if (cached) {
    console.log(`Cache hit for ${url}`);
    return cached;
  }

  // Fetch from network
  console.log(`Cache miss for ${url}, fetching...`);
  const response = await fetch(url, { credentials: 'include', ...options });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Cache the result
  apiCache.set(url, data, cacheParams, ttl);
  
  return data;
};

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}
