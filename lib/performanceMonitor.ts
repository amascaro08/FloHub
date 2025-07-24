/**
 * Performance monitoring utilities for FlowHub
 * This file contains functions to monitor and report performance metrics
 */

import { db } from './drizzle';
import { analyticsPerformanceMetrics, analyticsUsersDurations } from '@/db/schema';
import { useUser } from "@/lib/hooks/useUser";
import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface CacheMetric {
  hit: boolean;
  key: string;
  timestamp: number;
  ttl: number;
}

interface APIMetric {
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private cacheMetrics: CacheMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private maxMetrics = 1000; // Prevent memory leaks

  // Start timing a performance metric
  startMetric(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.metrics.push({
      name,
      startTime: performance.now(),
      metadata,
    });
    
    // Clean up old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
    
    return id;
  }

  // End timing a performance metric
  endMetric(id: string): void {
    const metric = this.metrics.find(m => m.name === id.split('_')[0]);
    if (metric && !metric.endTime) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
    }
  }

  // Record cache hit/miss
  recordCacheHit(key: string, hit: boolean, ttl: number): void {
    this.cacheMetrics.push({
      hit,
      key,
      timestamp: Date.now(),
      ttl,
    });
    
    // Clean up old cache metrics
    if (this.cacheMetrics.length > this.maxMetrics) {
      this.cacheMetrics = this.cacheMetrics.slice(-this.maxMetrics / 2);
    }
  }

  // Record API call
  recordAPICall(url: string, method: string, status: number, duration: number, error?: string): void {
    this.apiMetrics.push({
      url,
      method,
      status,
      duration,
      timestamp: Date.now(),
      error,
    });
    
    // Clean up old API metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics / 2);
    }
  }

  // Get performance summary
  getSummary(): {
    averageLoadTime: number;
    cacheHitRate: number;
    averageAPIDuration: number;
    errorRate: number;
    totalMetrics: number;
  } {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    const averageLoadTime = completedMetrics.length > 0 
      ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length 
      : 0;

    const cacheHits = this.cacheMetrics.filter(m => m.hit).length;
    const cacheHitRate = this.cacheMetrics.length > 0 
      ? (cacheHits / this.cacheMetrics.length) * 100 
      : 0;

    const successfulAPICalls = this.apiMetrics.filter(m => m.status >= 200 && m.status < 300);
    const averageAPIDuration = successfulAPICalls.length > 0 
      ? successfulAPICalls.reduce((sum, m) => sum + m.duration, 0) / successfulAPICalls.length 
      : 0;

    const errorRate = this.apiMetrics.length > 0 
      ? (this.apiMetrics.filter(m => m.status >= 400).length / this.apiMetrics.length) * 100 
      : 0;

    return {
      averageLoadTime,
      cacheHitRate,
      averageAPIDuration,
      errorRate,
      totalMetrics: this.metrics.length,
    };
  }

  // Get detailed metrics for debugging
  getDetailedMetrics(): {
    metrics: PerformanceMetric[];
    cacheMetrics: CacheMetric[];
    apiMetrics: APIMetric[];
  } {
    return {
      metrics: [...this.metrics],
      cacheMetrics: [...this.cacheMetrics],
      apiMetrics: [...this.apiMetrics],
    };
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.cacheMetrics = [];
    this.apiMetrics = [];
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify({
      summary: this.getSummary(),
      detailed: this.getDetailedMetrics(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Helper function to wrap async operations with performance monitoring
export const withPerformanceMonitoring = async <T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const id = performanceMonitor.startMetric(name, metadata);
  
  try {
    const result = await operation();
    performanceMonitor.endMetric(id);
    return result;
  } catch (error) {
    performanceMonitor.endMetric(id);
    throw error;
  }
};

// Helper function to monitor API calls
export const monitorAPICall = async <T>(
  url: string,
  options: RequestInit,
  operation: () => Promise<Response>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const response = await operation();
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordAPICall(
      url,
      options.method || 'GET',
      response.status,
      duration
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordAPICall(
      url,
      options.method || 'GET',
      0,
      duration,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    throw error;
  }
};

// Helper function to monitor cache operations
export const monitorCacheOperation = (
  key: string,
  hit: boolean,
  ttl: number
): void => {
  performanceMonitor.recordCacheHit(key, hit, ttl);
};

// Export the performance monitor for external access
export { performanceMonitor };

// Development-only logging
if (process.env.NODE_ENV === 'development') {
  // Log performance summary every 30 seconds
  setInterval(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.totalMetrics > 0) {
      console.log('Performance Summary:', summary);
    }
  }, 30000);
}