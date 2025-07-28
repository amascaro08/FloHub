/**
 * Performance optimization utilities for FlowHub
 */

// Debounce function to limit how often a function can be called
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function to limit the rate at which a function can be called
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Memoize function to cache results of expensive function calls
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

// Lazy load images when they enter the viewport
export function setupLazyLoading(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  
  const lazyImages = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        
        imageObserver.unobserve(img);
      }
    });
  });
  
  lazyImages.forEach((img) => {
    imageObserver.observe(img);
  });
}

// Prefetch data for routes that are likely to be visited
export function prefetchData(url: string, userEmail?: string): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      const data = await fetchWithCache(url);
      // Store in localStorage for quick access - USER SCOPED
      if (typeof window !== 'undefined' && userEmail) {
        const key = `prefetch:${userEmail}:${url}`;
        localStorage.setItem(key, JSON.stringify(data));
      }
      resolve(data);
    } catch (error) {
      console.warn('[Performance] Prefetch failed:', error);
      resolve(null);
    }
  });
}

// Enhanced error handling for localStorage operations
function safeLocalStorageOperation<T>(operation: () => T, fallback: T): T {
  try {
    return operation();
  } catch (error) {
    console.warn('[Performance] localStorage operation failed:', error);
    return fallback;
  }
}

// Get prefetched data from localStorage - USER SCOPED
export function getPrefetchedData(url: string, userEmail?: string): any {
  if (typeof window === 'undefined' || !userEmail) return null;
  
  return safeLocalStorageOperation(() => {
    const key = `prefetch:${userEmail}:${url}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      // Remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }, null);
}

// Measure component render time
export function measureRender(componentName: string): () => void {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return () => {}; // No-op if not in browser or performance API not available
  }
  
  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  const measureName = `${componentName}-render-time`;
  
  performance.mark(startMark);
  
  return () => {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
    
    const measurements = performance.getEntriesByName(measureName);
    if (measurements.length > 0) {
      console.log(`[Performance] ${componentName} render time: ${Math.round(measurements[0].duration)}ms`);
    }
    
    // Clean up
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  };
}

// Initialize IndexedDB for offline data caching
export async function initIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('flohub-cache', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores for different data types
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('[Performance] IndexedDB initialized successfully');
      resolve(db);
    };
    
    request.onerror = (event) => {
      console.error('[Performance] IndexedDB initialization error', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Store data in IndexedDB - USER SCOPED
export async function storeInIndexedDB(
  userEmail: string,
  storeName: string,
  key: string, 
  data: any
): Promise<void> {
  try {
    const db = await initIndexedDB();
    if (!db) return;
    
    // Create user-scoped key
    const scopedKey = `${userEmail}:${key}`;
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: scopedKey, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`[Performance] Error in storeInIndexedDB for ${storeName}`, e);
  }
}

// Get data from IndexedDB - USER SCOPED
export async function getFromIndexedDB<T>(
  userEmail: string,
  storeName: string,
  key: string
): Promise<T | null> {
  try {
    const db = await initIndexedDB();
    if (!db) return null;
    
    // Create user-scoped key
    const scopedKey = `${userEmail}:${key}`;
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise<T | null>((resolve, reject) => {
      const request = store.get(scopedKey);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`[Performance] Error in getFromIndexedDB for ${storeName}`, e);
    return null;
  }
}

// Clear user-specific data from localStorage and IndexedDB
export async function clearUserCache(userEmail: string): Promise<void> {
  try {
    // Clear localStorage entries for this user
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(userEmail)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // Clear IndexedDB entries for this user
    const db = await initIndexedDB();
    if (db) {
      const storeNames = ['performance', 'calendar', 'widgets'];
      for (const storeName of storeNames) {
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          
          // Get all keys and remove user-scoped ones
          const request = store.getAllKeys();
          request.onsuccess = () => {
            const keys = request.result;
            keys.forEach(key => {
              if (typeof key === 'string' && key.startsWith(`${userEmail}:`)) {
                store.delete(key);
              }
            });
          };
        } catch (error) {
          console.warn(`[Performance] Error clearing ${storeName} for user ${userEmail}:`, error);
        }
      }
    }
    
    console.log(`[Performance] Cleared cache for user: ${userEmail}`);
  } catch (error) {
    console.error('[Performance] Error clearing user cache:', error);
  }
}