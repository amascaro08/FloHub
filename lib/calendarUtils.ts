import { CalendarSource } from '@/types/app';

/**
 * Generate a hash string from calendar sources to detect changes
 */
export const generateCalendarSourcesHash = (calendarSources?: CalendarSource[]): string => {
  if (!calendarSources || calendarSources.length === 0) {
    return 'empty';
  }

  // Create a string representation of enabled calendar sources
  const enabledSources = calendarSources
    .filter(source => source.isEnabled)
    .map(source => `${source.type}:${source.sourceId || source.connectionData}:${source.id}`)
    .sort() // Sort to ensure consistent hash
    .join('|');

  // Simple hash function (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < enabledSources.length; i++) {
    hash = ((hash << 5) + hash) + enabledSources.charCodeAt(i);
  }
  
  return hash.toString();
};

/**
 * Clear all calendar-related caches
 */
export const clearAllCalendarCaches = async (): Promise<void> => {
  try {
    // Clear in-memory cache
    if (typeof window !== 'undefined') {
      // Clear sessionStorage calendar cache
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('calendar') || key.includes('events')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear localStorage calendar cache
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.includes('calendar') || key.includes('events')) {
          localStorage.removeItem(key);
        }
      });
    }

    // Clear IndexedDB cache
    const { calendarCache } = await import('./calendarCache');
    await calendarCache.clearAllCache();
    
    console.log('All calendar caches cleared');
  } catch (error) {
    console.error('Error clearing calendar caches:', error);
  }
};