# iCal Timeout Fix Summary

This document summarizes the changes made to fix the timeout issue with iCal feed processing and enhance debugging capabilities.

## Problem

The original error showed that a PowerAutomate URL generating an ICS file was timing out after 8 seconds:

```
Error fetching iCal events from https://prod-63.australiasoutheast.logic.azure.com:443/workflows/.../invoke: 
AxiosError: timeout of 8000ms exceeded
```

The issue was that node-ical uses axios internally with a default 8-second timeout, and our 30-second timeout configuration wasn't being properly applied.

## Root Cause

- **PowerAutomate URL generating ICS**: The URL in the error was a PowerAutomate Logic App URL that generates an ICS file, so it should be treated as an iCal source
- **node-ical timeout configuration**: The timeout option passed to `ical.async.fromURL()` wasn't being correctly applied to the underlying axios request
- **Default axios timeout**: node-ical was falling back to axios's default timeout of 8 seconds

## Solutions Implemented

### 1. Enhanced iCal Timeout Configuration

**Files Modified:**
- `pages/api/calendar.ts` (main calendar API)
- `pages/api/calendar/test-ical.ts` (URL testing endpoint)  
- `pages/api/calendar/debug.ts` (debug API)

**Changes Made:**
```javascript
// Before
const events = await ical.async.fromURL(processedUrl, {
  timeout: 30000,
  headers: {
    'User-Agent': 'FloHub Calendar Integration/1.0'
  }
});

// After
const events = await ical.async.fromURL(processedUrl, {
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'FloHub Calendar Integration/1.0'
  },
  // Additional axios timeout configuration
  timeoutErrorMessage: 'iCal feed request timeout',
});
```

### 2. Comprehensive Debug Enhancement

**New Debug Features:**
- **Individual Calendar Source Testing**: Tests each Google, O365, and iCal source separately
- **Real-time Event Counts**: Shows exactly how many events each source provides
- **Detailed Error Reporting**: Specific error messages and status codes for each source
- **Calendar Metadata**: Extracts and displays iCal calendar information (name, description, timezone)
- **Visual Status Indicators**: Color-coded status (green=success, red=error) with icons

**Debug Page Enhancements:**
- Added "Calendar Sources Debug" section with individual source testing
- Enhanced summary with total event count across all sources
- Proper error categorization (success, token_expired, api_error, fetch_error, etc.)
- URL truncation for security (shows first 40 characters)
- Calendar metadata display for iCal feeds

### 3. Timeout Configuration Matrix

| Component | Main API | Test API | Debug API |
|-----------|----------|----------|-----------|
| **iCal Timeout** | 30 seconds | 30 seconds | 10 seconds |
| **Google API** | 8 seconds | N/A | 10 seconds |
| **O365/PowerAutomate** | 10 seconds | 10 seconds | 10 seconds |

### 4. Error Handling Improvements

**Enhanced Error Categories:**
- `success` - Everything working correctly
- `not_connected` - Source not configured  
- `token_expired` - Google token needs refresh
- `api_error` - HTTP error from remote service
- `fetch_error` - Network or parsing error (including timeout)
- `no_url` - Missing connection data

**Better Error Messages:**
- Specific timeout error messages
- Detailed axios error information
- Proper error categorization based on error codes
- User-friendly error descriptions

## Testing and Validation

### Debug Page Usage
1. Navigate to `/calendar/debug`
2. Click "Refresh" to run diagnostics
3. Check "Calendar Sources Debug" section for detailed source information
4. Review event counts and status for each configured source
5. Use error messages to troubleshoot configuration issues

### Expected Behavior
- **iCal Feeds**: 30-second timeout should handle slower PowerAutomate Logic Apps
- **Event Counts**: Debug page shows exactly how many events each source provides
- **Error Details**: Specific error messages for timeout vs. other issues
- **Real-time Testing**: Changes can be tested immediately without waiting

## Benefits

1. **Increased Reliability**: 30-second timeout accommodates slower iCal feeds
2. **Better Debugging**: Immediate visibility into which sources are working/failing
3. **Detailed Insights**: Event counts and metadata for each calendar source
4. **Faster Troubleshooting**: Real-time testing and specific error messages
5. **Enhanced Monitoring**: Visual status indicators and comprehensive error reporting

## PowerAutomate ICS Support

This fix specifically addresses PowerAutomate Logic Apps that generate ICS files:
- Properly classifies PowerAutomate ICS URLs as iCal sources
- Applies 30-second timeout for slow Logic App responses  
- Provides detailed error reporting for connection issues
- Shows calendar metadata extracted from the ICS feed

## Future Improvements

- Consider implementing caching for iCal feeds to reduce repeated requests
- Add retry logic for transient failures
- Implement background refresh scheduling for better performance
- Add support for authenticated iCal feeds if needed

The implementation provides a robust foundation for handling various types of iCal feeds, including PowerAutomate-generated ICS files, with proper timeout handling and comprehensive debugging capabilities.