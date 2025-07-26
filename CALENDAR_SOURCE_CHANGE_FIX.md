# Calendar Source Change Detection and Cache Invalidation Fix

## Problem
When calendar sources are removed or added in settings (like removing a Power Automate URL), the calendar continues to display cached events from the removed source. The system was not detecting calendar source changes and invalidating the cache accordingly.

## Root Cause
1. **No Change Detection**: The `useCalendarEvents` hook had no way to detect when calendar sources changed
2. **Cache Persistence**: Cached events remained in IndexedDB and in-memory caches even after sources were removed
3. **No Invalidation Trigger**: Settings changes didn't trigger calendar cache invalidation

## Solution Implemented

### 1. Calendar Sources Hash Generation ✅
**File**: `lib/calendarUtils.ts` (new file)
**Purpose**: Generate a stable hash from enabled calendar sources to detect changes

```typescript
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
```

### 2. Enhanced useCalendarEvents Hook ✅
**File**: `hooks/useCalendarEvents.ts`
**Changes**:
- Added `calendarSourcesHash` parameter to detect source changes
- Added useEffect to clear cache and reload when hash changes

```typescript
interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  calendarSourcesHash?: string; // Hash of calendar sources to detect changes
}

// Clear cache and reload when calendar sources change
useEffect(() => {
  if (!isInitializing && calendarSourcesHash) {
    console.log('Calendar sources changed, clearing cache and reloading events');
    invalidateCache().then(() => {
      loadEvents(true); // Force reload
    });
  }
}, [calendarSourcesHash, isInitializing, invalidateCache, loadEvents]);
```

### 3. Settings Change Handler Enhancement ✅
**File**: `pages/dashboard/settings-modular.tsx`
**Changes**:
- Detect when calendar sources change during settings update
- Clear all calendar caches when sources change
- Force refresh calendar API cache

```typescript
// Check if calendar sources have changed
const oldSourcesHash = JSON.stringify(oldSettings.calendarSources?.filter(s => s.isEnabled) || []);
const newSourcesHash = JSON.stringify(newSettings.calendarSources?.filter(s => s.isEnabled) || []);
const calendarSourcesChanged = oldSourcesHash !== newSourcesHash;

// Clear calendar cache if sources changed
if (calendarSourcesChanged) {
  console.log("Calendar sources changed, clearing caches...");
  try {
    const { clearAllCalendarCaches } = await import('@/lib/calendarUtils');
    await clearAllCalendarCaches();
    
    // Also force refresh calendar API cache
    await fetch('/api/calendar?forceRefresh=true&timeMin=2024-01-01T00:00:00Z&timeMax=2024-12-31T23:59:59Z');
    
    console.log("Calendar caches cleared and refreshed");
  } catch (cacheError) {
    console.error("Error clearing calendar cache:", cacheError);
  }
}
```

### 4. Comprehensive Cache Clearing ✅
**File**: `lib/calendarUtils.ts`
**Purpose**: Clear all types of calendar caches

```typescript
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
```

### 5. Calendar Page Integration ✅
**File**: `pages/calendar/index.tsx`
**Changes**:
- Generate calendar sources hash from settings
- Pass hash to useCalendarEvents hook

```typescript
// Generate hash of calendar sources to detect changes
const calendarSourcesHash = useMemo(() => {
  return generateCalendarSourcesHash(settings?.calendarSources);
}, [settings?.calendarSources]);

// Use cached calendar events hook
const {
  events,
  isLoading,
  error: fetchError,
  addEvent,
  updateEvent,
  removeEvent,
  invalidateCache,
  refetch
} = useCalendarEvents({
  startDate,
  endDate,
  enabled: !!user && !!settings?.selectedCals,
  calendarSourcesHash
});
```

### 6. CalendarContext Enhancement ✅
**File**: `contexts/CalendarContext.tsx`
**Changes**:
- Added calendar sources parameter
- Generate hash and pass to useCalendarEvents

## How It Works

### When Calendar Sources Are Removed:
1. User removes a Power Automate URL or disables a calendar source in settings
2. `handleSettingsChange` detects the change by comparing old and new enabled sources
3. All calendar caches are cleared (IndexedDB, sessionStorage, localStorage)
4. Calendar API cache is force-refreshed with `forceRefresh=true`
5. Hash of calendar sources changes
6. `useCalendarEvents` hook detects hash change via useEffect
7. Cache is invalidated and events are reloaded with new sources
8. Calendar displays only events from currently enabled sources

### When Calendar Sources Are Added:
1. User adds a new calendar source
2. Same cache invalidation process occurs
3. New events from the added source are fetched and displayed

## Testing the Fix

### To Test Source Removal:
1. Have a Power Automate URL configured with events showing
2. Remove the Power Automate URL in settings
3. Calendar should immediately reload and stop showing those work events
4. Check browser console for "Calendar sources changed, clearing caches..." message

### To Test Source Addition:
1. Add a new calendar source (Power Automate URL, iCal feed, etc.)
2. Calendar should reload and display events from the new source
3. Check console for cache clearing and reload messages

### Debug Information:
Monitor the browser console for these messages:
- "Calendar sources changed, clearing caches..."
- "All calendar caches cleared"
- "Calendar caches cleared and refreshed"
- "Calendar sources changed, clearing cache and reloading events"

## Expected Behavior After Fix

1. **Immediate Response**: Calendar reloads immediately when sources are changed
2. **Clean Cache**: Old cached events are completely removed
3. **Accurate Display**: Only events from currently enabled sources are shown
4. **No Orphaned Data**: Removed sources don't leave cached events behind
5. **Performance**: Cache invalidation is efficient and targeted

## Files Modified

1. `lib/calendarUtils.ts` - New utility file for cache management
2. `hooks/useCalendarEvents.ts` - Enhanced with source change detection
3. `pages/dashboard/settings-modular.tsx` - Added cache invalidation on source changes
4. `pages/calendar/index.tsx` - Integrated calendar sources hash
5. `contexts/CalendarContext.tsx` - Enhanced with calendar sources support

This fix ensures that the calendar immediately reflects changes when sources are added or removed, providing a responsive and accurate user experience.