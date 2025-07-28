# Calendar Day View Refresh Loop & Calendar Sources Deletion Fix

## Problem Summary
The calendar day view was experiencing:
1. **Continuous Refresh Loop**: Day view was refreshing every few seconds
2. **Calendar Sources Deletion**: Google Calendar sources were being deleted during the refresh loop
3. **Performance Issues**: Excessive API calls causing poor user experience

## Root Causes Identified

### 1. Unstable React Hook Dependencies
- `useCalendarEvents` hook had circular dependencies between `startDate`, `endDate`, `loadEvents`, and `invalidateCache`
- Calendar sources hash was regenerating on every render due to object reference changes
- Background refresh was triggering too frequently (every 30 minutes)

### 2. Calendar Sources Hash Instability  
- Hash was being generated from the entire settings object, causing changes on unrelated property updates
- No deep comparison of actual calendar source properties
- Hash changes triggered cache invalidation and event reloading

### 3. Accidental Calendar Sources Deletion
- `userSettings/update` API was defaulting to empty array when `calendarSources` was undefined
- No safeguards to preserve existing calendar sources during partial updates

## Comprehensive Solution

### 1. Stabilized useCalendarEvents Hook (`/hooks/useCalendarEvents.ts`)

**Key Changes:**
- **Disabled Background Refresh**: Completely disabled automatic background refresh to prevent loops
- **Increased Debounce Timeouts**: 
  - Calendar sources changes: 8 seconds (was 3 seconds)
  - Date range changes: 2 seconds (was 1.5 seconds)
- **Stable Function References**: Created `loadEventsStable` with explicit parameters to prevent dependency cycles
- **Calendar Sources Change Detection**: Added `lastCalendarSourcesHashRef` to only react to actual changes, not initialization
- **Timeout Management**: Proper cleanup of all timeouts to prevent memory leaks

**Technical Implementation:**
```typescript
// Track actual changes, not initialization
const lastCalendarSourcesHashRef = useRef<string>('');

// Only react to real changes
if (lastCalendarSourcesHashRef.current && 
    lastCalendarSourcesHashRef.current !== calendarSourcesHash) {
  // Trigger reload with heavy debounce
}
```

### 2. Ultra-Stable Calendar Sources Hash (`/pages/calendar/index.tsx`)

**Key Changes:**
- **Deep Property Comparison**: Only includes essential properties (type, sourceId, connectionData, isEnabled)
- **Stable Sorting**: Deterministic sort order to prevent hash changes from array reordering
- **Memoization Dependencies**: Uses stable string representation instead of object references

**Technical Implementation:**
```typescript
const calendarSourcesHash = useMemo(() => {
  const stableSourcesData = settings.calendarSources
    .filter(source => source.isEnabled)
    .map(source => ({
      type: source.type,
      sourceId: source.sourceId,
      connectionData: source.connectionData,
      isEnabled: source.isEnabled
    }))
    .sort((a, b) => `${a.type}:${a.sourceId}`.localeCompare(`${b.type}:${b.sourceId}`));
  
  return generateCalendarSourcesHash(stableSourcesData);
}, [
  settings?.calendarSources?.length, 
  settings?.calendarSources?.map(s => `${s.type}:${s.sourceId}:${s.isEnabled}`).join('|')
]);
```

### 3. Calendar Sources Protection (`/pages/api/userSettings/update.ts`)

**Key Changes:**
- **Existing Sources Preservation**: Fetch existing calendar sources before update
- **Safeguard Logic**: Preserve existing sources if update doesn't explicitly include them
- **Explicit Deletion Detection**: Only clear sources when `calendarSources: []` is explicitly sent

**Technical Implementation:**
```typescript
// Get existing calendar sources
const existingCalendarSources = await getExistingCalendarSources(user_email);

// Safeguard logic
let finalCalendarSources = newSettings.calendarSources || [];
if (finalCalendarSources.length === 0 && existingCalendarSources.length > 0) {
  if (newSettings.calendarSources === undefined) {
    // Preserve existing sources if not explicitly included in update
    finalCalendarSources = existingCalendarSources;
  }
}
```

## Files Modified

1. **`/hooks/useCalendarEvents.ts`** - Stabilized hook dependencies and disabled background refresh
2. **`/pages/calendar/index.tsx`** - Ultra-stable calendar sources hash generation  
3. **`/pages/api/userSettings/update.ts`** - Added calendar sources protection safeguards

## Testing Results Expected

### Before Fix:
- ❌ Day view refreshes every few seconds
- ❌ Calendar sources get deleted during refresh
- ❌ Poor performance with excessive API calls
- ❌ User has to manually re-add Google Calendar sources

### After Fix:
- ✅ Day view loads once and stays stable
- ✅ Calendar sources remain intact during view changes
- ✅ Minimal API calls only when necessary
- ✅ Smooth user experience across all calendar views

## Monitoring & Debugging

Added comprehensive logging:
- Calendar sources change detection with before/after values
- Timeout management and cleanup logging
- API call frequency monitoring
- Cache invalidation tracking

## Performance Improvements

- **API Calls Reduced**: From every few seconds to only when actually needed
- **Memory Usage**: Proper timeout cleanup prevents memory leaks
- **User Experience**: No more jarring refresh loops in day view
- **Data Integrity**: Calendar sources remain stable across all operations

## Long-term Considerations

1. **Background Refresh**: Can be re-enabled later with much longer intervals (1+ hours)
2. **Cache Strategy**: Current aggressive caching reduces server load
3. **Monitoring**: Added hooks for future performance monitoring
4. **Scalability**: Stable hash generation supports larger calendar source lists

This comprehensive fix addresses the root causes of both the refresh loop and calendar sources deletion, providing a stable and performant calendar experience.