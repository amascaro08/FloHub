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
export function prefetchData(urls: string[]): void {
  if (typeof window === 'undefined') return;
  
  // Wait until the page has loaded and is idle
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      urls.forEach(url => {
        fetch(url, { method: 'GET', credentials: 'same-origin' })
          .then(response => response.json())
          .then(data => {
            // Store in sessionStorage for quick access
            try {
              sessionStorage.setItem(`prefetch:${url}`, JSON.stringify(data));
              console.log(`[Performance] Prefetched data for ${url}`);
            } catch (e) {
              console.warn(`[Performance] Failed to store prefetched data for ${url}`, e);
            }
          })
          .catch(err => {
            console.warn(`[Performance] Failed to prefetch ${url}`, err);
          });
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      urls.forEach(url => {
        fetch(url, { method: 'GET', credentials: 'same-origin' })
          .catch(err => console.warn(`[Performance] Failed to prefetch ${url}`, err));
      });
    }, 2000);
  }
}

// Get prefetched data from sessionStorage
export function getPrefetchedData<T>(url: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = sessionStorage.getItem(`prefetch:${url}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn(`[Performance] Failed to get prefetched data for ${url}`, e);
    return null;
  }
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

// Store data in IndexedDB
export async function storeInIndexedDB(
  storeName: string,
  data: any,
  db?: IDBDatabase | null
): Promise<boolean> {
  if (!db) {
    db = await initIndexedDB();
    if (!db) return false;
  }
  
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        console.error(`[Performance] Error storing data in ${storeName}`, request.error);
        resolve(false);
      };
    } catch (e) {
      console.error(`[Performance] Error in storeInIndexedDB for ${storeName}`, e);
      resolve(false);
    }
  });
}

// Get data from IndexedDB
export async function getFromIndexedDB<T>(
  storeName: string,
  id: string,
  db?: IDBDatabase | null
): Promise<T | null> {
  if (!db) {
    db = await initIndexedDB();
    if (!db) return null;
  }
  
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error(`[Performance] Error getting data from ${storeName}`, request.error);
        resolve(null);
      };
    } catch (e) {
      console.error(`[Performance] Error in getFromIndexedDB for ${storeName}`, e);
      resolve(null);
    }
  });
}