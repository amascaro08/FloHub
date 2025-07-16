/**
 * Analytics tracking utilities for FlowHub
 * This file contains functions to track user behavior and send it to Firestore
 */

// No direct database import needed, will use fetch to API route
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Track page visit
export async function trackPageVisit(page: string, userId?: string) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page_visit',
        eventData: { page, userId },
      }),
    });
  } catch (error) {
    console.warn('[Analytics] Failed to track page visit:', error);
  }
}

// Track widget usage
export async function trackWidgetUsage(widget: string, userId?: string) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'widget_usage',
        eventData: { widget, userId },
      }),
    });
  } catch (error) {
    console.warn('[Analytics] Failed to track widget usage:', error);
  }
}

// Track FloCat interaction
export async function trackFloCatInteraction(interactionType: string, userId?: string) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'flocat_interaction',
        eventData: { interactionType, userId },
      }),
    });
  } catch (error) {
    console.warn('[Analytics] Failed to track FloCat interaction:', error);
  }
}

// Track feature usage
export async function trackFeatureUsage(feature: string, userId?: string) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'feature_usage',
        eventData: { feature, userId },
      }),
    });
  } catch (error) {
    console.warn('[Analytics] Failed to track feature usage:', error);
  }
}

// React hook to track page views
export function usePageViewTracking() {
  const router = useRouter();
  const { user } = useUser();
  
  useEffect(() => {
    // Function to handle route change complete
    const handleRouteChange = (url: string) => {
      // Don't track admin pages
      if (url.includes('/dashboard/admin')) {
        return;
      }
      
      // Track the page visit
      trackPageVisit(url, user?.primaryEmail || undefined);
    };
    
    // Track initial page load
    if (router.isReady && !router.pathname.includes('/dashboard/admin')) {
      trackPageVisit(router.pathname, user?.primaryEmail || undefined);
    }
    
    // Set up route change tracking
    router.events.on('routeChangeComplete', handleRouteChange);
    
    // Clean up event listener
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.isReady, router.pathname, user]);
}

// React hook to track widget usage
export function useWidgetTracking(widgetName: string) {
  const { user } = useUser();
  
  useEffect(() => {
    // Track widget mount
    trackWidgetUsage(widgetName, user?.primaryEmail || undefined);
  }, [widgetName, user]);
  
  // Return a function to track interactions with the widget
  return {
    trackInteraction: (interactionType: string) => {
      trackFeatureUsage(`${widgetName}:${interactionType}`, user?.primaryEmail || undefined);
    }
  };
}