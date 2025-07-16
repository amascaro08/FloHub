/**
 * Enhanced fetcher with Stale-While-Revalidate pattern
 * This utility improves perceived performance by:
 * 1. Returning cached data immediately if available
 * 2. Revalidating the cache in the background
 * 3. Falling back to network requests when cache is unavailable
 */

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Cache prefix to avoid collisions
const CACHE_PREFIX = 'flohub:cache:';

/**
 * Enhanced fetcher function with SWR pattern
 * @param url The URL to fetch
 * @param options Optional fetch options
 * @param cacheKey Optional custom cache key (defaults to URL)
 * @param cacheDuration Optional custom cache duration in milliseconds
 */
export const enhancedFetcher = async <T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string,
  cacheDuration: number = CACHE_EXPIRATION
): Promise<T> => {
  // Use provided cache key or generate one from the URL
  const key = cacheKey || `${CACHE_PREFIX}${url}`;
  const timeKey = `${key}:time`;
  
  try {
    // Try to get from cache first
    const cachedData = localStorage.getItem(key);
    const cachedTime = localStorage.getItem(timeKey);
    
    // If we have cached data, use it immediately
    if (cachedData && cachedTime) {
      const data = JSON.parse(cachedData) as T;
      const time = parseInt(cachedTime, 10);
      
      // If cache is fresh, return it
      if (Date.now() - time < cacheDuration) {
        return data;
      }
      
      // If cache is stale but exists, return it but revalidate in background
      setTimeout(async () => {
        try {
          await refreshCache<T>(url, options, key, timeKey);
        } catch (error) {
          console.error('Background revalidation failed:', error);
        }
      }, 0);
      
      return data;
    }
  } catch (error) {
    console.warn('Error accessing cache:', error);
    // Continue with network request if cache access fails
  }
  
  // If no cache or cache access failed, fetch fresh data
  return refreshCache<T>(url, options, key, timeKey);
};

/**
 * Helper function to fetch fresh data and update cache
 */
async function refreshCache<T>(
  url: string,
  options?: RequestInit,
  key?: string,
  timeKey?: string
): Promise<T> {
  const res = await fetch(url, { ...options, credentials: 'include' });
  if (!res.ok) {
    throw new Error(`HTTP error! Status: ${res.status}`);
  }
  
  if (!res.ok) {
    throw new Error(`HTTP error! Status: ${res.status}`);
  }
  
  const data = await res.json() as T;
  
  // Cache the response if we have a key
  if (key && timeKey) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(timeKey, Date.now().toString());
    } catch (error) {
      console.warn('Error updating cache:', error);
    }
  }
  
  return data;
}

/**
 * Clear all cached data
 */
export const clearCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all cache keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}:time`);
    });
    
    console.log(`Cleared ${keysToRemove.length} cached items`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Clear specific cached data
 */
export const clearCacheItem = (url: string, cacheKey?: string): void => {
  try {
    const key = cacheKey || `${CACHE_PREFIX}${url}`;
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}:time`);
  } catch (error) {
    console.error('Error clearing cache item:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): { count: number, size: number } => {
  try {
    let count = 0;
    let size = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        count++;
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length * 2; // Approximate size in bytes (UTF-16 encoding)
        }
      }
    }
    
    return { count, size };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, size: 0 };
  }
};