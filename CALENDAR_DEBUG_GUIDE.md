# Calendar Widget Debug Guide

## What I Fixed

### 1. Added Required API Parameters
The calendar API requires `timeMin` and `timeMax` parameters. I fixed:
- **AtAGlanceWidget**: Now calculates proper 7-day time range
- **CalendarWidget**: Waits for settings before making API calls

### 2. Improved Error Logging
Added detailed console logging to help debug issues:

#### CalendarWidget Console Logs:
- `"CalendarWidget: Not ready yet:"` - Shows what's missing (user, settings, timeRange)
- `"CalendarWidget loaded settings:"` - Shows what calendar settings were loaded
- `"CalendarWidget: Built API URL:"` - Shows the exact API URL being called
- `"CalendarWidget: Fetching from URL:"` - Shows when API call starts
- `"Calendar API error details:"` - Shows detailed error information

#### AtAGlanceWidget Console Logs:
- Shows time range calculations and API URLs

### 3. Settings Validation
- CalendarWidget now waits for both user AND settings before making API calls
- Supports both `selectedCals` (legacy) and `calendarSources` (new) formats
- Defaults to `['primary']` if no calendars are configured

## Current Status

✅ **Fixed**: API parameter validation (no more "Missing timeMin or timeMax" errors)
✅ **Fixed**: Settings dependency issues
✅ **Added**: Comprehensive error logging
✅ **Added**: Upcoming event highlighting
✅ **Added**: Teams meeting integration

## How to Debug

### Step 1: Check Browser Console
Open Developer Tools (F12) and look for these logs:

1. **Settings Loading**:
   ```
   CalendarWidget loaded settings: {
     selectedCals: [...],
     hasCalendarSources: true/false
   }
   ```

2. **API URL Construction**:
   ```
   CalendarWidget: Built API URL: /api/calendar?timeMin=...&timeMax=...
   ```

3. **API Calls**:
   ```
   CalendarWidget: Fetching from URL: /api/calendar?...
   ```

4. **Error Details**:
   ```
   Calendar API error details: {
     status: 400,
     response: {...}
   }
   ```

### Step 2: Common Issues and Solutions

#### Issue: "Not ready yet" message
**Cause**: User not logged in or settings not loaded
**Solution**: Check authentication and calendar settings in dashboard/settings

#### Issue: 400 error with timeMin/timeMax
**Cause**: Invalid date format or missing parameters
**Solution**: Check console for exact API URL being called

#### Issue: No events showing
**Possible Causes**:
1. No calendar sources configured
2. No events in the date range
3. API authentication issues
4. Calendar integration not set up

### Step 3: Check Calendar Settings
Go to `/dashboard/settings` and verify:
- Google Calendar is connected
- At least one calendar is selected
- Calendar sources are configured

### Step 4: Test Main Calendar Page
Visit `/calendar` to see if events load there:
- If events load on main calendar page but not widgets → Widget-specific issue
- If events don't load anywhere → Calendar integration issue

## Next Steps

1. **Check browser console** for the detailed logs I added
2. **Test the calendar settings page** to ensure calendars are properly configured
3. **Try the main calendar page** to verify calendar integration works
4. **Report specific error messages** from the console logs for further debugging

The widgets now have much better error handling and logging, so we can identify the exact issue causing the 400 errors.
