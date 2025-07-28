import { CalendarEvent } from '@/types/calendar';

interface CachedEvent {
  id: string;
  events: CalendarEvent[];
  startDate: string;
  endDate: string;
  lastUpdated: number;
  source: 'google' | 'o365' | 'ical';
  calendarId?: string;
}

interface CalendarCacheDB {
  name: string;
  version: number;
  stores: {
    events: {
      keyPath: 'id';
      indexes: {
        startDate: 'startDate';
        endDate: 'endDate';
        lastUpdated: 'lastUpdated';
        source: 'source';
        calendarId: 'calendarId';
      };
    };
  };
}

class CalendarCacheService {
  private db: IDBDatabase | null = null;
  private userEmail: string | null = null;
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'events';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Get user-scoped database name
  private getDBName(userEmail: string): string {
    // Create a user-specific database name
    const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    return `CalendarCacheDB_${sanitizedEmail}`;
  }

  async init(userEmail: string): Promise<void> {
    // If user changed, close existing connection and reset
    if (this.userEmail !== userEmail) {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.userEmail = userEmail;
    }

    if (this.db) return;

    const dbName = this.getDBName(userEmail);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`Calendar cache initialized for user: ${userEmail}`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create the events store
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('startDate', 'startDate');
          store.createIndex('endDate', 'endDate');
          store.createIndex('lastUpdated', 'lastUpdated');
          store.createIndex('source', 'source');
          store.createIndex('calendarId', 'calendarId');
        }
      };
    });
  }

  private async getStore(mode: IDBTransactionMode = 'readonly', userEmail?: string): Promise<IDBObjectStore> {
    if (!userEmail) {
      throw new Error('User email is required for calendar cache operations');
    }
    
    if (!this.db || this.userEmail !== userEmail) {
      await this.init(userEmail);
    }
    
    const transaction = this.db!.transaction([this.STORE_NAME], mode);
    return transaction.objectStore(this.STORE_NAME);
  }

  async getCachedEvents(startDate: Date, endDate: Date, userEmail: string): Promise<CalendarEvent[]> {
    try {
      const store = await this.getStore('readonly', userEmail);
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      return new Promise((resolve, reject) => {
        const request = store.index('startDate').getAll(IDBKeyRange.bound(startDateStr, endDateStr));
        
        request.onsuccess = () => {
          const cachedEvents: CalendarEvent[] = [];
          const now = Date.now();

          request.result.forEach((cached: CachedEvent) => {
            // Check if cache is still valid
            if (now - cached.lastUpdated < this.CACHE_DURATION) {
              cachedEvents.push(...cached.events);
            }
          });

          resolve(cachedEvents);
        };

        request.onerror = () => {
          console.error('Error reading from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting cached events:', error);
      return [];
    }
  }

  async cacheEvents(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date,
    source: 'google' | 'o365' | 'ical',
    userEmail: string,
    calendarId?: string
  ): Promise<void> {
    try {
      const store = await this.getStore('readwrite', userEmail);
      const cacheKey = `${source}_${calendarId || 'default'}_${startDate.toISOString()}_${endDate.toISOString()}_${userEmail}`;

      // First, clear any existing cache entries for this source/calendar combo to prevent duplicates
      const clearRequest = store.index('source').openCursor(IDBKeyRange.only(source));
      
      return new Promise((resolve, reject) => {
        const entriesToDelete: string[] = [];
        
        clearRequest.onsuccess = () => {
          const cursor = clearRequest.result;
          if (cursor) {
            const cached = cursor.value as CachedEvent;
            // Delete entries from the same source and calendar that overlap with our date range
            if (cached.calendarId === (calendarId || 'default')) {
              const cachedStart = new Date(cached.startDate);
              const cachedEnd = new Date(cached.endDate);
              // Check for overlap
              if (cachedStart <= endDate && cachedEnd >= startDate) {
                entriesToDelete.push(cached.id);
              }
            }
            cursor.continue();
          } else {
            // Now delete the overlapping entries
            const deletePromises = entriesToDelete.map(id => {
              return new Promise<void>((deleteResolve) => {
                const deleteRequest = store.delete(id);
                deleteRequest.onsuccess = () => deleteResolve();
                deleteRequest.onerror = () => deleteResolve(); // Continue even if delete fails
              });
            });
            
            Promise.all(deletePromises).then(() => {
              // Now add the new cache entry
              const cachedEvent: CachedEvent = {
                id: cacheKey,
                events,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                lastUpdated: Date.now(),
                source,
                calendarId,
              };

              const putRequest = store.put(cachedEvent);
              
              putRequest.onsuccess = () => {
                resolve();
              };

              putRequest.onerror = () => {
                console.error('Error caching events:', putRequest.error);
                reject(putRequest.error);
              };
            });
          }
        };

        clearRequest.onerror = () => {
          console.error('Error clearing overlapping cache entries:', clearRequest.error);
          reject(clearRequest.error);
        };
      });
    } catch (error) {
      console.error('Error caching events:', error);
    }
  }

  async getDeltaEvents(
    startDate: Date,
    endDate: Date,
    lastSyncTime: number,
    userEmail: string
  ): Promise<{ events: CalendarEvent[]; hasNewEvents: boolean }> {
    try {
      const store = await this.getStore('readonly', userEmail);
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      return new Promise((resolve, reject) => {
        const request = store.index('lastUpdated').getAll(IDBKeyRange.lowerBound(lastSyncTime));
        
        request.onsuccess = () => {
          const deltaEvents: CalendarEvent[] = [];
          let hasNewEvents = false;

          request.result.forEach((cached: CachedEvent) => {
            // Check if this cached range overlaps with our requested range
            const cachedStart = new Date(cached.startDate);
            const cachedEnd = new Date(cached.endDate);
            
            if (cachedStart <= endDate && cachedEnd >= startDate) {
              deltaEvents.push(...cached.events);
              hasNewEvents = true;
            }
          });

          resolve({ events: deltaEvents, hasNewEvents });
        };

        request.onerror = () => {
          console.error('Error getting delta events:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting delta events:', error);
      return { events: [], hasNewEvents: false };
    }
  }

  async clearExpiredCache(userEmail: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite', userEmail);
      const cutoffTime = Date.now() - this.CACHE_DURATION;

      return new Promise((resolve, reject) => {
        const request = store.index('lastUpdated').openCursor(IDBKeyRange.upperBound(cutoffTime));
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          console.error('Error clearing expired cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  async clearAllCache(userEmail: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite', userEmail);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log(`Cleared all calendar cache for user: ${userEmail}`);
          resolve();
        };

        request.onerror = () => {
          console.error('Error clearing all cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  async getCacheStats(userEmail: string): Promise<{ totalEvents: number; cacheSize: number }> {
    try {
      const store = await this.getStore('readonly', userEmail);
      let totalEvents = 0;
      let cacheSize = 0;

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          request.result.forEach((cached: CachedEvent) => {
            totalEvents += cached.events.length;
            cacheSize += 1;
          });

          resolve({ totalEvents, cacheSize });
        };

        request.onerror = () => {
          console.error('Error getting cache stats:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEvents: 0, cacheSize: 0 };
    }
  }

  // Utility method to clear cache for a specific user (useful for logout)
  async clearUserCache(userEmail: string): Promise<void> {
    try {
      const dbName = this.getDBName(userEmail);
      
      // Close current connection if it's the same user
      if (this.userEmail === userEmail && this.db) {
        this.db.close();
        this.db = null;
        this.userEmail = null;
      }
      
      // Delete the entire database for this user
      return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
          console.log(`Deleted calendar cache database for user: ${userEmail}`);
          resolve();
        };
        deleteRequest.onerror = () => {
          console.error('Error deleting user cache database:', deleteRequest.error);
          reject(deleteRequest.error);
        };
      });
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }
}

// Export singleton instance
export const calendarCache = new CalendarCacheService();