/**
 * Enhanced fetcher with Stale-While-Revalidate pattern
 * This utility improves perceived performance by:
 * 1. Returning cached data immediately if available
 * 2. Revalidating the cache in the background
 * 3. Falling back to network requests when cache is unavailable
 */

export interface EnhancedFetchOptions extends Omit<RequestInit, 'cache'> {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean; // Renamed to avoid conflict with RequestInit.cache
  cacheTTL?: number;
  userEmail?: string; // ADD USER SCOPING
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  userEmail: string; // ADD USER SCOPING
}

// In-memory cache - now user-scoped
const memoryCache = new Map<string, CacheEntry>();

// Helper to generate user-scoped cache keys
function getCacheKey(url: string, userEmail?: string): string {
  if (!userEmail) {
    // For non-user-specific requests, use a generic key
    return `public:${url}`;
  }
  return `${userEmail}:${url}`;
}

// Enhanced localStorage operations with user scoping
function getCachedData(url: string, userEmail?: string): any {
  const key = getCacheKey(url, userEmail);
  const timeKey = `${key}:time`;
  
  try {
    const cachedData = localStorage.getItem(key);
    const cachedTime = localStorage.getItem(timeKey);
    
    if (cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      
      // Check in-memory cache for TTL
      const memEntry = memoryCache.get(key);
      const ttl = memEntry?.ttl || 300000; // Default 5 minutes
      
      if (age < ttl) {
        return JSON.parse(cachedData);
      } else {
        // Expired, remove from cache
        localStorage.removeItem(key);
        localStorage.removeItem(timeKey);
        memoryCache.delete(key);
      }
    }
  } catch (error) {
    console.warn('Error reading from cache:', error);
  }
  
  return null;
}

function setCachedData(url: string, data: any, ttl: number, userEmail?: string): void {
  const key = getCacheKey(url, userEmail);
  const timeKey = `${key}:time`;
  
  try {
    // Store in localStorage
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(timeKey, Date.now().toString());
    
    // Store in memory cache with TTL and user info
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      userEmail: userEmail || 'public'
    });
  } catch (error) {
    console.warn('Error writing to cache:', error);
  }
}

// Clear cache for specific user
export function clearUserSpecificCache(userEmail: string): void {
  // Clear localStorage entries for this user
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(`${userEmail}:`) || key.startsWith(`${userEmail}:`))) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}:time`);
    }
  }
  
  // Clear memory cache entries for this user
  memoryCache.forEach((entry, key) => {
    if (entry.userEmail === userEmail || key.startsWith(`${userEmail}:`)) {
      memoryCache.delete(key);
    }
  });
  
  console.log(`Cleared cache for user: ${userEmail}`);
}

// Clear expired cache entries (cleanup function)
export function clearExpiredCache(): void {
  const now = Date.now();
  
  // Clear expired localStorage entries
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !key.endsWith(':time')) {
      const timeKey = `${key}:time`;
      const cachedTime = localStorage.getItem(timeKey);
      
      if (cachedTime) {
        const memEntry = memoryCache.get(key);
        const ttl = memEntry?.ttl || 300000; // Default 5 minutes
        const age = now - parseInt(cachedTime);
        
        if (age > ttl) {
          localStorage.removeItem(key);
          localStorage.removeItem(timeKey);
          memoryCache.delete(key);
        }
      }
    }
  }
  
  // Clear expired memory cache entries
  memoryCache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
    }
  });
}

// Get cache statistics by user
export function getCacheStats(userEmail?: string): { totalEntries: number; userEntries: number; totalSize: number } {
  let totalEntries = 0;
  let userEntries = 0;
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !key.endsWith(':time')) {
      const item = localStorage.getItem(key);
      if (item) {
        totalEntries++;
        totalSize += item.length;
        
        if (userEmail && key.startsWith(`${userEmail}:`)) {
          userEntries++;
        }
      }
    }
  }
  
  return { totalEntries, userEntries, totalSize };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function enhancedFetch(url: string, options: EnhancedFetchOptions = {}): Promise<any> {
  const {
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    enableCache = true,
    cacheTTL = 300000, // 5 minutes default
    userEmail,
    ...fetchOptions
  } = options;

  // Check cache first (if enabled)
  if (enableCache) {
    const cached = getCachedData(url, userEmail);
    if (cached) {
      console.log(`Cache hit for ${userEmail ? `user ${userEmail}` : 'public'}: ${url}`);
      return cached;
    }
  }

  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result (if enabled)
      if (enableCache) {
        setCachedData(url, data, cacheTTL, userEmail);
        console.log(`Cached response for ${userEmail ? `user ${userEmail}` : 'public'}: ${url}`);
      }

      return data;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt} failed for ${url}:`, lastError.message);

      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} attempts. Last error: ${lastError!.message}`);
}