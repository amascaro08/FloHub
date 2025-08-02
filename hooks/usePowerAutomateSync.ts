import { useEffect, useState, useCallback } from 'react';
import { PowerAutomatePollingService, PollingConfig } from '@/lib/powerAutomatePolling';

export interface UsePowerAutomateSyncOptions {
  enabled?: boolean;
  intervalMinutes?: number;
  maxSyncsPerDay?: number;
  syncOnPageLoad?: boolean;
  syncOnUserActivity?: boolean;
}

export interface SyncStatus {
  lastSync: Date | null;
  syncCountToday: number;
  isActive: boolean;
  isPolling: boolean;
}

export const usePowerAutomateSync = (options: UsePowerAutomateSyncOptions = {}) => {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    syncCountToday: 0,
    isActive: false,
    isPolling: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingService = PowerAutomatePollingService.getInstance();

  // Default configuration
  const config: PollingConfig = {
    enabled: options.enabled ?? true,
    intervalMinutes: options.intervalMinutes ?? 120, // 2 hours
    maxSyncsPerDay: options.maxSyncsPerDay ?? 5,
    syncOnPageLoad: options.syncOnPageLoad ?? true,
    syncOnUserActivity: options.syncOnUserActivity ?? true
  };

  // Start polling
  const startPolling = useCallback(() => {
    try {
      pollingService.startPolling(config);
      setStatus(prev => ({ ...prev, isPolling: true }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start polling');
    }
  }, [config]);

  // Stop polling
  const stopPolling = useCallback(() => {
    try {
      pollingService.stopPolling();
      setStatus(prev => ({ ...prev, isPolling: false }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop polling');
    }
  }, []);

  // Manual sync trigger
  const triggerManualSync = useCallback(async (userEmail?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await pollingService.triggerManualSync(userEmail || '');
      
      if (success) {
        // Update status after successful sync
        const stats = pollingService.getSyncStats();
        setStatus(prev => ({
          ...prev,
          lastSync: stats.lastSync,
          syncCountToday: stats.syncCountToday
        }));
      } else {
        setError('Manual sync failed');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Manual sync failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const stats = pollingService.getSyncStats();
      setStatus(prev => ({
        ...prev,
        lastSync: stats.lastSync,
        syncCountToday: stats.syncCountToday,
        isActive: stats.isActive
      }));
    };

    // Update status immediately
    updateStatus();

    // Update status every minute
    const interval = setInterval(updateStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  // Start polling on mount if enabled
  useEffect(() => {
    if (config.enabled) {
      startPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [config.enabled, startPolling, stopPolling]);

  // Get sync status from API
  const getSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/power-automate-sync');
      if (response.ok) {
        const data = await response.json();
        return data.status;
      } else {
        throw new Error('Failed to get sync status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync status');
      return null;
    }
  }, []);

  return {
    // State
    status,
    isLoading,
    error,
    
    // Actions
    startPolling,
    stopPolling,
    triggerManualSync,
    getSyncStatus,
    
    // Configuration
    config
  };
};