/**
 * Performance Optimization Service
 * Handles caching, async tasks, and performance monitoring
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
}

class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    lastUpdated: Date.now()
  };
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Smart cache with TTL and automatic cleanup
   */
  async getCached<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Check if cache is valid
    if (cached && (now - cached.timestamp) < cached.ttl) {
      this.updateMetrics('cache_hit');
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const request = this.fetchWithTimeout(fetcher, 10000);
    this.pendingRequests.set(key, request);

    try {
      const data = await request;
      this.cache.set(key, { data, timestamp: now, ttl });
      this.updateMetrics('success');
      return data;
    } catch (error) {
      this.updateMetrics('error');
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Fetch with timeout and retry logic
   */
  private async fetchWithTimeout<T>(
    fetcher: () => Promise<T>, 
    timeout: number,
    retries: number = 2
  ): Promise<T> {
    const startTime = Date.now();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          fetcher(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);

        this.metrics.loadTime = Date.now() - startTime;
        return result;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(type: 'cache_hit' | 'success' | 'error') {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.metrics.lastUpdated;

    if (timeSinceLastUpdate > 60000) { // Reset metrics every minute
      this.metrics = {
        loadTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        lastUpdated: now
      };
    }

    switch (type) {
      case 'cache_hit':
        this.metrics.cacheHitRate = Math.min(1, this.metrics.cacheHitRate + 0.1);
        break;
      case 'success':
        this.metrics.errorRate = Math.max(0, this.metrics.errorRate - 0.05);
        break;
      case 'error':
        this.metrics.errorRate = Math.min(1, this.metrics.errorRate + 0.1);
        break;
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Prefetch data for better perceived performance
   */
  async prefetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000): Promise<void> {
    try {
      await this.getCached(key, fetcher, ttl);
    } catch (error) {
      // Silently fail for prefetch requests
      console.warn('Prefetch failed for key:', key, error);
    }
  }

  /**
   * Batch multiple requests for better performance
   */
  async batchRequests<T>(
    requests: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>
  ): Promise<T[]> {
    const promises = requests.map(({ key, fetcher, ttl }) => 
      this.getCached(key, fetcher, ttl)
    );

    return Promise.all(promises);
  }

  /**
   * Debounced function execution
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttled function execution
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Cleanup cache every 5 minutes
setInterval(() => {
  performanceOptimizer.cleanupCache();
}, 300000);

// Export types
export type { CacheEntry, PerformanceMetrics };