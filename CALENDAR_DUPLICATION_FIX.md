# Calendar Duplication Fix - Power Automate Events

## Problem
Power Automate calendar events were being duplicated multiple times due to:
1. **Random ID Generation**: Events were getting new IDs each time due to `Math.random()` in ID creation
2. **Cache Appending**: Events were being added to cache rather than replacing existing entries
3. **Delta Loading Issues**: Delta updates were adding events without proper deduplication
4. **IndexedDB Cache Overlap**: Multiple cache entries for the same source were accumulating

## Root Causes

### 1. Random ID Generation in Power Automate Events
**File**: `pages/api/calendar.ts`
**Issue**: 
```typescript
id: `o365_${e.startTime || e.start?.dateTime || e.title || e.subject}_${Math.random().toString(36).substring(7)}`
```
**Result**: Same event got different IDs on each API call, preventing deduplication.

### 2. In-Memory Cache Appending
**File**: `pages/api/calendar.ts`
**Issue**: Power Automate cache was using simple replacement but events could still accumulate due to ID changes.

### 3. Delta Loading Duplication
**File**: `hooks/useCalendarEvents.ts`
**Issue**: Delta events were merged without proper deduplication:
```typescript
const newEvents = deltaResult.events.filter(e => !existingIds.has(e.id));
return [...prev, ...newEvents];
```

### 4. IndexedDB Cache Accumulation
**File**: `lib/calendarCache.ts`
**Issue**: Cache entries for overlapping date ranges weren't being cleared before adding new ones.

## Fixes Applied

### 1. Stable ID Generation ✅
**File**: `pages/api/calendar.ts` (lines ~470-480)
**Fix**: 
```typescript
// Create a stable ID based on content, not random values
const startTime = e.startTime || e.start?.dateTime || e.start?.date;
const summary = e.title || e.subject || "No Title (Work)";
const stableId = `o365_${encodeURIComponent(summary)}_${startTime}_${source?.id || "default"}`;
```
**Benefit**: Same event always gets same ID, enabling proper deduplication.

### 2. Enhanced Delta Loading with Deduplication ✅
**File**: `hooks/useCalendarEvents.ts` (lines ~200-215)
**Fix**:
```typescript
// Merge delta events with existing events, ensuring no duplicates
if (newEvents.length > 0) {
  const combined = [...prev, ...newEvents];
  const deduped = Array.from(
    new Map(combined.map(event => [event.id, event])).values()
  );
  return deduped;
}
```
**Benefit**: Even if duplicates slip through, they're removed during delta updates.

### 3. Main Load Deduplication ✅
**File**: `hooks/useCalendarEvents.ts` (lines ~145-150)
**Fix**:
```typescript
// Deduplicate events by ID to prevent duplicates from Power Automate or other sources
const deduplicatedEvents = Array.from(
  new Map(events.map(event => [event.id, event])).values()
);
```
**Benefit**: All events are deduplicated immediately after fetching from API.

### 4. IndexedDB Cache Overlap Prevention ✅
**File**: `lib/calendarCache.ts` (lines ~125-170)
**Fix**: Added logic to clear overlapping cache entries before adding new ones:
```typescript
// First, clear any existing cache entries for this source/calendar combo to prevent duplicates
const clearRequest = store.index('source').openCursor(IDBKeyRange.only(source));
// ... clear overlapping entries before adding new cache entry
```
**Benefit**: Prevents accumulation of overlapping cache entries.

### 5. Force Refresh Parameter ✅
**File**: `pages/api/calendar.ts` (lines ~221, ~420-430)
**Fix**: Added `forceRefresh` parameter to bypass cache:
```typescript
if (forceRefresh === "true") {
  console.log("Force refresh requested, clearing cache for URL:", url);
  clearPowerAutomateCache(url);
}
```
**Benefit**: Allows manual cache clearing when duplicates are detected.

## Testing the Fix

### Immediate Test
1. Open browser developer console
2. Call calendar API with force refresh:
   ```javascript
   fetch('/api/calendar?timeMin=2024-01-01T00:00:00Z&timeMax=2024-12-31T23:59:59Z&forceRefresh=true')
   ```
3. Verify no duplicate events in response

### Ongoing Monitoring
1. **Check event IDs**: All Power Automate events should have stable, content-based IDs
2. **Monitor cache behavior**: Events should not accumulate over time
3. **Verify deduplication**: Multiple API calls should return consistent event counts

## Prevention Measures

### 1. Stable ID Strategy
- Power Automate events now use: `o365_{encodedSummary}_{startTime}_{sourceId}`
- Google events continue using Google's native IDs
- iCal events use similar content-based stable IDs

### 2. Cache Invalidation
- Overlapping cache entries are cleared before new entries are added
- Force refresh parameter available for manual cache clearing
- Cache TTL ensures eventual consistency

### 3. Multi-Layer Deduplication
- **API Level**: Stable IDs prevent duplicate creation
- **Load Level**: Deduplication in `useCalendarEvents` hook
- **Delta Level**: Deduplication during background updates
- **Cache Level**: Overlap prevention in IndexedDB

## Expected Behavior After Fix

1. **Power Automate events**: Should appear exactly once per occurrence
2. **Cache performance**: Maintained with proper replacement strategy
3. **Background updates**: Should not accumulate duplicates
4. **Manual refresh**: Available via `forceRefresh=true` parameter

## Rollback Plan
If issues arise, the key changes can be reverted by:
1. Restoring random ID generation in Power Automate event processing
2. Removing deduplication logic in `useCalendarEvents.ts`
3. Reverting cache clearing logic in `calendarCache.ts`

However, this would restore the duplication issue.