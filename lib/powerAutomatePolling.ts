/**
 * Power Automate Polling Service
 * 
 * This service provides client-side polling for Power Automate syncs
 * to supplement the daily cron job. It can trigger syncs when users
 * are active on the application.
 */

export interface PollingConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxSyncsPerDay: number;
  syncOnPageLoad: boolean;
  syncOnUserActivity: boolean;
}

export interface SyncTrigger {
  type: 'manual' | 'polling' | 'activity' | 'page_load';
  timestamp: Date;
  userEmail: string;
}

class PowerAutomatePollingService {
  private static instance: PowerAutomatePollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;
  private syncCountToday = 0;
  private lastSyncDate: string | null = null;
  private isActive = false;

  private constructor() {
    this.resetDailyCount();
  }

  public static getInstance(): PowerAutomatePollingService {
    if (!PowerAutomatePollingService.instance) {
      PowerAutomatePollingService.instance = new PowerAutomatePollingService();
    }
    return PowerAutomatePollingService.instance;
  }

  /**
   * Start polling for Power Automate syncs
   */
  public startPolling(config: PollingConfig): void {
    if (!config.enabled) {
      console.log('Power Automate polling disabled');
      return;
    }

    this.isActive = true;
    console.log(`Starting Power Automate polling every ${config.intervalMinutes} minutes`);

    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      this.attemptSync('polling', config);
    }, config.intervalMinutes * 60 * 1000);

    // Sync on page load if enabled
    if (config.syncOnPageLoad) {
      this.attemptSync('page_load', config);
    }

    // Set up activity listeners if enabled
    if (config.syncOnUserActivity) {
      this.setupActivityListeners(config);
    }
  }

  /**
   * Stop polling
   */
  public stopPolling(): void {
    this.isActive = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('Power Automate polling stopped');
  }

  /**
   * Manual sync trigger
   */
  public async triggerManualSync(userEmail: string): Promise<boolean> {
    return this.attemptSync('manual', {
      enabled: true,
      intervalMinutes: 0,
      maxSyncsPerDay: 10,
      syncOnPageLoad: false,
      syncOnUserActivity: false
    }, userEmail);
  }

  /**
   * Attempt to sync Power Automate events
   */
  private async attemptSync(
    triggerType: SyncTrigger['type'], 
    config: PollingConfig,
    userEmail?: string
  ): Promise<boolean> {
    // Check if we've exceeded daily sync limit
    if (this.syncCountToday >= config.maxSyncsPerDay) {
      console.log(`Daily sync limit reached (${config.maxSyncsPerDay}). Skipping sync.`);
      return false;
    }

    // Check if enough time has passed since last sync (minimum 30 minutes)
    if (this.lastSyncTime && 
        Date.now() - this.lastSyncTime.getTime() < 30 * 60 * 1000) {
      console.log('Minimum sync interval not met (30 minutes). Skipping sync.');
      return false;
    }

    try {
      // Get current user email if not provided
      if (!userEmail) {
        // This would need to be implemented based on your auth system
        userEmail = await this.getCurrentUserEmail();
        if (!userEmail) {
          console.log('No user email available for sync');
          return false;
        }
      }

      console.log(`Triggering Power Automate sync (${triggerType}) for user: ${userEmail}`);

      const response = await fetch('/api/power-automate-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceRefresh: false,
          sourceId: 'default'
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.lastSyncTime = new Date();
        this.syncCountToday++;
        
        console.log(`Sync successful (${triggerType}):`, result);
        
        // Store sync trigger for analytics
        this.storeSyncTrigger({
          type: triggerType,
          timestamp: new Date(),
          userEmail
        });

        return true;
      } else {
        console.error(`Sync failed (${triggerType}):`, response.status, response.statusText);
        return false;
      }

    } catch (error) {
      console.error(`Sync error (${triggerType}):`, error);
      return false;
    }
  }

  /**
   * Set up activity listeners for user-triggered syncs
   */
  private setupActivityListeners(config: PollingConfig): void {
    let activityTimeout: NodeJS.Timeout | null = null;
    const ACTIVITY_DELAY = 5 * 60 * 1000; // 5 minutes after last activity

    const handleActivity = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }

      activityTimeout = setTimeout(() => {
        if (this.isActive) {
          this.attemptSync('activity', config);
        }
      }, ACTIVITY_DELAY);
    };

    // Listen for user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    console.log('Activity listeners set up for Power Automate sync');
  }

  /**
   * Reset daily sync count
   */
  private resetDailyCount(): void {
    const today = new Date().toDateString();
    
    if (this.lastSyncDate !== today) {
      this.syncCountToday = 0;
      this.lastSyncDate = today;
      console.log('Reset daily sync count');
    }
  }

  /**
   * Get current user email (implement based on your auth system)
   */
  private async getCurrentUserEmail(): Promise<string | null> {
    try {
      // This is a placeholder - implement based on your auth system
      // You might get this from a session, context, or API call
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const session = await response.json();
        return session?.user?.email || null;
      }
    } catch (error) {
      console.error('Error getting current user email:', error);
    }
    return null;
  }

  /**
   * Store sync trigger for analytics
   */
  private storeSyncTrigger(trigger: SyncTrigger): void {
    try {
      // Store in localStorage for analytics
      const triggers = JSON.parse(localStorage.getItem('powerAutomateSyncTriggers') || '[]');
      triggers.push(trigger);
      
      // Keep only last 100 triggers
      if (triggers.length > 100) {
        triggers.splice(0, triggers.length - 100);
      }
      
      localStorage.setItem('powerAutomateSyncTriggers', JSON.stringify(triggers));
    } catch (error) {
      console.error('Error storing sync trigger:', error);
    }
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    lastSync: Date | null;
    syncCountToday: number;
    isActive: boolean;
  } {
    return {
      lastSync: this.lastSyncTime,
      syncCountToday: this.syncCountToday,
      isActive: this.isActive
    };
  }
}

export { PowerAutomatePollingService };