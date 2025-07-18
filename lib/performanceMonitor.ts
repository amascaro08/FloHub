/**
 * Performance monitoring utilities for FlowHub
 * This file contains functions to monitor and report performance metrics
 */

import { db } from './drizzle';
import { analyticsPerformanceMetrics, analyticsUsersDurations } from '@/db/schema';
import { useUser } from "@/lib/hooks/useUser";
import { useEffect } from 'react';

// Interface for performance metrics
interface PerformanceMetrics {
  fcp: number | null;  // First Contentful Paint
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  navStart: number;    // Navigation Start timestamp
  loadComplete: number | null; // Load complete timestamp
  apiCalls: Record<string, number>; // API call durations
  componentRenders: Record<string, number>; // Component render times
}

// Initialize metrics object
let metrics: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  fid: null,
  cls: null,
  ttfb: null,
  navStart: typeof performance !== 'undefined' ? performance.now() : 0,
  loadComplete: null,
  apiCalls: {},
  componentRenders: {}
};

// Reset metrics (useful for SPA navigation)
export function resetMetrics(): void {
  metrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    navStart: typeof performance !== 'undefined' ? performance.now() : 0, // Use performance.now() for consistency
    loadComplete: null,
    apiCalls: {},
    componentRenders: {}
  };
}

// Start monitoring performance metrics
export function startPerformanceMonitoring(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Record navigation start time
  metrics.navStart = performance.now(); // Use performance.now() for consistency

  // Monitor First Contentful Paint (FCP)
  try {
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        metrics.fcp = entries[0].startTime;
        console.log(`[Performance] First Contentful Paint: ${Math.round(metrics.fcp)}ms`);
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    console.warn('[Performance] FCP monitoring not supported', e);
  }

  // Monitor Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      // We use the most recent LCP event
      const lastEntry = entries[entries.length - 1];
      metrics.lcp = lastEntry.startTime;
      console.log(`[Performance] Largest Contentful Paint: ${Math.round(metrics.lcp)}ms`);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    console.warn('[Performance] LCP monitoring not supported', e);
  }

  // Monitor First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const firstInput = entries[0] as any;
        metrics.fid = firstInput.processingStart - firstInput.startTime;
        console.log(`[Performance] First Input Delay: ${Math.round(metrics.fid)}ms`);
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    console.warn('[Performance] FID monitoring not supported', e);
  }

  // Monitor Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      }
      metrics.cls = clsValue;
      console.log(`[Performance] Cumulative Layout Shift: ${metrics.cls?.toFixed(3)}`);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    console.warn('[Performance] CLS monitoring not supported', e);
  }

  // Monitor Time to First Byte (TTFB)
  try {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
      console.log(`[Performance] Time to First Byte: ${Math.round(metrics.ttfb)}ms`);
    }
  } catch (e) {
    console.warn('[Performance] TTFB monitoring not supported', e);
  }

  // Record when page load is complete
  window.addEventListener('load', () => {
    // Always use performance.now() for both navStart and loadComplete
    metrics.loadComplete = performance.now();
    // If navStart is not set, set it to performance.now()
    if (!metrics.navStart || metrics.navStart < 0) {
      metrics.navStart = performance.now();
    }
    let loadTime = metrics.loadComplete - metrics.navStart;
    // The check for negative loadTime might still be useful as a safeguard, but should be less frequent with consistent timing
    if (loadTime < 0) {
      console.warn('[Performance] Detected negative page load time. navStart:', metrics.navStart, 'loadComplete:', metrics.loadComplete);
      loadTime = 0;
    }
    console.log(`[Performance] Total page load time: ${Math.round(loadTime)}ms`);
    // Send metrics to analytics after page load
    setTimeout(() => {
      sendMetricsToAnalytics();
    }, 1000);
  });
}

// Track API call performance
export function trackApiCall(url: string, startTime: number, endTime: number): void {
  const duration = endTime - startTime;
  
  // Extract the base endpoint from the URL
  const urlObj = new URL(url, window.location.origin);
  const endpoint = urlObj.pathname.split('/').slice(0, 3).join('/');
  
  metrics.apiCalls[endpoint] = (metrics.apiCalls[endpoint] || 0) + duration;
  console.log(`[Performance] API call to ${endpoint}: ${Math.round(duration)}ms`);
}

// Track component render time
export function trackComponentRender(componentName: string, duration: number): void {
  metrics.componentRenders[componentName] = duration;
  console.log(`[Performance] ${componentName} render time: ${Math.round(duration)}ms`);
}

// Get current performance metrics
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

// Send metrics to analytics service
async function sendMetricsToAnalytics(): Promise<void> {
  // Log metrics to console for debugging
  console.log('[Performance] Sending metrics to analytics:', metrics);
  
  try {
    // Get user ID if available
    let userId = null;
    if (typeof window !== 'undefined') {
      try {
        // Try to get user email from localStorage (set during user)
        userId = localStorage.getItem('flohub.userEmail');
      } catch (e) {
        console.warn('[Performance] Error getting user ID:', e);
      }
    }
    
    // Send metrics to Firestore
    // Send metrics to Neon
    const dataToStore = {
      ...metrics,
      userId,
      timestamp: new Date()
    };

    const columns = Object.keys(dataToStore).map(key => `"${key}"`).join(', ');
    const values = Object.values(dataToStore);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await db.insert(analyticsPerformanceMetrics).values(dataToStore);
    
    console.log('[Performance] Metrics sent to Neon successfully');
  } catch (e) {
    console.warn('[Performance] Error sending metrics to Neon:', e);
    
    // Fallback to API endpoint if Neon fails (or if this is a client-side error)
    if (typeof fetch !== 'undefined') {
      try {
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metrics),
          // Don't wait for the response - fire and forget
          keepalive: true,
        }).catch(err => {
          console.warn('[Performance] Failed to send metrics to API:', err);
        });
      } catch (e) {
        console.warn('[Performance] Error sending metrics to API:', e);
      }
    }
  }
}

// Create a performance-wrapped fetch function
export function performanceFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = performance.now();
  
  // Extract URL string from input
  let urlString: string;
  if (typeof input === 'string') {
    urlString = input;
  } else if (input instanceof Request) {
    urlString = input.url;
  } else {
    // Handle URL object
    urlString = input.toString();
  }
  
  return fetch(input, init).then(response => {
    const endTime = performance.now();
    trackApiCall(urlString, startTime, endTime);
    return response;
  }).catch(error => {
    const endTime = performance.now();
    trackApiCall(urlString, startTime, endTime);
    throw error;
  });
}

// Track user user duration
let userStartTime = Date.now();
let isTracking = false;

export function startuserTracking(): void {
  if (isTracking) return;
  
  userStartTime = Date.now();
  isTracking = true;
  
  // Set up event listeners for user end
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', trackuserEnd);
    
    // Also track user when user navigates away (SPA)
    window.addEventListener('pagehide', trackuserEnd);
  }
}

async function trackuserEnd(): Promise<void> {
  if (!isTracking) return;
  
  const userDuration = (Date.now() - userStartTime) / 1000 / 60; // Convert to minutes
  isTracking = false;
  
  try {
    // Get user ID if available
    let userId = null;
    if (typeof window !== 'undefined') {
      try {
        // Try to get user email from localStorage
        userId = localStorage.getItem('flohub.userEmail');
      } catch (e) {
        console.warn('[Performance] Error getting user ID for user tracking:', e);
      }
    }
    
    // Send user data to Firestore
    // Send user data to Neon
    const dataToStore = {
      userDuration,
      userId,
      timestamp: new Date()
    };

    const columns = Object.keys(dataToStore).map(key => `"${key}"`).join(', ');
    const values = Object.values(dataToStore);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await db.insert(analyticsUsersDurations).values(dataToStore);
    
    console.log(`[Performance] user duration tracked: ${userDuration.toFixed(2)} minutes`);
  } catch (e) {
    console.warn('[Performance] Error tracking user duration:', e);
  }
}

// React hook to use performance monitoring in components
export function usePerformanceMonitoring() {
  // Defensive: useUser may be undefined if next-auth is not initialized or during SSR
  const { user } = useUser()
  
  useEffect(() => {
    startPerformanceMonitoring();
    startuserTracking();
    if (user?.primaryEmail) {
      try {
        localStorage.setItem('flohub.userEmail', user.primaryEmail);
      } catch (e) {
        console.warn('[Performance] Error storing user email:', e);
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', trackuserEnd);
        window.removeEventListener('pagehide', trackuserEnd);
      }
    };
  }, [user]);
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  startPerformanceMonitoring();
  startuserTracking();
}