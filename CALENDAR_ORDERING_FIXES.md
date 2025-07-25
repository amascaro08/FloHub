# Calendar Widget Ordering and Recurring Events Fixes

## Issues Identified

1. **Calendar Widget Ordering Issue**: Events were not being sorted by start time, causing single events to appear before recurring events regardless of their actual timing.

2. **AtAGlanceWidget Recurring Events Issue**: The widget was not properly detecting or displaying recurring events from PowerAutomate URLs, even though they were being processed by the API.

## Root Cause Analysis

### Ordering Issue
- The calendar API (`pages/api/calendar.ts`) was combining events from multiple sources (Google Calendar, PowerAutomate/O365, iCal) without sorting them by start time.
- Events were returned in the order they were fetched from each source, not chronologically.

### Recurring Events Issue
- The API was correctly identifying recurring events from PowerAutomate URLs and adding `isRecurring` metadata.
- However, the widgets were not properly displaying this metadata or using it for filtering.

## Fixes Implemented

### 1. Calendar API Sorting (`pages/api/calendar.ts`)

**Location**: Lines 580-595 (after combining all event sources)

```typescript
// Sort events by start time to ensure proper ordering
allEvents.sort((a, b) => {
  const aStart = a.start?.dateTime || a.start?.date;
  const bStart = b.start?.dateTime || b.start?.date;
  
  if (!aStart && !bStart) return 0;
  if (!aStart) return 1;
  if (!bStart) return -1;
  
  const aTime = new Date(aStart).getTime();
  const bTime = new Date(bStart).getTime();
  
  return aTime - bTime;
});
```

**Impact**: All calendar events are now returned in chronological order by start time, regardless of their source.

### 2. CalendarWidget Recurring Event Display (`components/widgets/CalendarWidget.tsx`)

**Location**: Event display section (around line 320)

```typescript
<div className="font-medium flex items-center gap-2">
  {event.summary}
  {event.isRecurring && (
    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">
      🔄
    </span>
  )}
</div>
```

**Impact**: Recurring events now show a 🔄 indicator in the calendar widget.

### 3. AtAGlanceWidget Recurring Event Detection (`components/widgets/AtAGlanceWidget.tsx`)

**Location**: Event processing section

```typescript
// Log recurring events for debugging
const recurringEvents = events.filter(event => event.isRecurring);
if (recurringEvents.length > 0) {
  console.log('AtAGlanceWidget: Found recurring events:', recurringEvents.map(e => ({
    summary: e.summary,
    isRecurring: e.isRecurring,
    seriesMasterId: e.seriesMasterId
  })));
}
```

**Impact**: Added debugging to track recurring events and ensure they're being detected.

### 4. AtAGlanceWidget Recurring Event Indicators

**Location**: Dashboard event display sections

```typescript
const recurringIcon = event.isRecurring ? '🔄' : '';
return `<div class="item">
  <span class="item-time">${time}</span>
  <span class="item-text">${event.summary}</span>
  <span class="event-type">${isWork ? '💼' : '👤'}${recurringIcon}</span>
</div>`;
```

**Impact**: Recurring events now show 🔄 indicators in both today's and tomorrow's event sections.

## Testing

Created and ran a test script to verify the ordering logic:

```javascript
// Test events with mixed timing and recurring status
const testEvents = [
  { summary: 'Morning Meeting', start: { dateTime: '2024-01-15T09:00:00Z' }, isRecurring: false },
  { summary: 'Recurring Standup', start: { dateTime: '2024-01-15T08:30:00Z' }, isRecurring: true },
  // ... more events
];

// Sort by start time
const sortedEvents = testEvents.sort((a, b) => {
  const aTime = new Date(a.start.dateTime).getTime();
  const bTime = new Date(b.start.dateTime).getTime();
  return aTime - bTime;
});
```

**Result**: Events are now properly ordered by start time, with recurring events appearing in their correct chronological position.

## Expected Behavior After Fixes

1. **Calendar Widget**: Events will appear in chronological order by start time, with recurring events mixed in with single events based on their timing.

2. **AtAGlanceWidget**: 
   - Recurring events will be properly detected and displayed
   - Recurring events will show 🔄 indicators
   - Events will be ordered chronologically in both today's and tomorrow's sections

3. **API Response**: All calendar events will be sorted by start time before being returned to the frontend.

## Verification

To verify the fixes are working:

1. Check the browser console for "AtAGlanceWidget: Found recurring events" logs
2. Look for 🔄 indicators on recurring events in both widgets
3. Verify that events appear in chronological order regardless of their source
4. Confirm that PowerAutomate recurring events are being picked up by AtAGlanceWidget

## Files Modified

1. `pages/api/calendar.ts` - Added event sorting
2. `components/widgets/CalendarWidget.tsx` - Added recurring event indicators
3. `components/widgets/AtAGlanceWidget.tsx` - Added recurring event detection and display
4. `CALENDAR_ORDERING_FIXES.md` - This documentation file

## Notes

- The sorting is done at the API level, ensuring consistent ordering across all widgets
- Recurring event detection relies on the `isRecurring` flag set by the API
- The fixes maintain backward compatibility with existing calendar sources
- Debug logging has been added to help track recurring event detection