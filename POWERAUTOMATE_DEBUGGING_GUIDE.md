# PowerAutomate iCal Integration Debugging Guide

This guide helps diagnose and resolve issues with PowerAutomate Logic App URLs that generate iCal content but return 0 events in FloHub.

## Problem Description

**Issue**: PowerAutomate Logic App URL downloads a valid ICS file when accessed directly in a browser, but FloHub reports 0 events when testing the URL.

**Example URL Format**:
```
https://prod-63.australiasoutheast.logic.azure.com/workflows/fbf82878b8a3432fb79865fc70b74afb/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3NsS298ycGU9rjtrxhGJq8x4X47HDSxhTDpIqK2FlF8
```

## Debugging Enhancements

### Enhanced Test Endpoint

The `/api/calendar/test-ical` endpoint has been enhanced with comprehensive debugging:

**New Features**:
- **Response Analysis**: Captures HTTP status, content-type, headers, and response length
- **Content Validation**: Checks if response contains valid iCal structure (`BEGIN:VCALENDAR`)
- **Response Preview**: Shows first 200 characters of the response for debugging
- **Header Analysis**: Examines all response headers to identify format issues

**Usage**:
1. Go to Settings → Calendar Settings
2. Click "Add iCal Calendar" 
3. Enter your PowerAutomate URL
4. Click "Test URL" to get detailed debugging information

### Enhanced Main Calendar API

The main calendar API (`/api/calendar`) now includes special debugging for PowerAutomate URLs:

**PowerAutomate Detection**:
- Automatically detects URLs containing `logic.azure.com`
- Performs preliminary fetch to analyze the response
- Logs detailed information about the response format

**Debug Information Logged**:
- HTTP status code
- Content-Type header
- Response length
- Whether response contains `BEGIN:VCALENDAR`
- First 100 characters of response

## Common Issues and Solutions

### 1. Content-Type Header Issues

**Problem**: PowerAutomate might not set the correct `Content-Type` header.

**Expected Headers**:
- `text/calendar`
- `application/calendar`
- `text/plain` (also acceptable)

**Solution**: Ensure your PowerAutomate Logic App sets the correct response headers:
```json
{
  "headers": {
    "Content-Type": "text/calendar; charset=utf-8"
  },
  "body": "@{variables('icalContent')}"
}
```

### 2. Response Format Issues

**Problem**: PowerAutomate response might not be properly formatted iCal.

**Check for**:
- Response starts with `BEGIN:VCALENDAR`
- Response ends with `END:VCALENDAR`
- Valid iCal structure between tags
- Proper line endings (CRLF or LF)

**Example Valid iCal Structure**:
```ical
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PowerAutomate//NONSGML Calendar//EN
BEGIN:VEVENT
UID:event1@domain.com
DTSTART:20241215T100000Z
DTEND:20241215T110000Z
SUMMARY:Test Event
DESCRIPTION:Test Description
END:VEVENT
END:VCALENDAR
```

### 3. Authentication/Access Issues

**Problem**: PowerAutomate URL might require specific authentication or be accessible only under certain conditions.

**Check**:
- URL is publicly accessible without authentication
- Logic App has proper trigger configuration
- API permissions are correctly set

### 4. Encoding Issues

**Problem**: PowerAutomate might return encoded content that node-ical can't parse.

**Solutions**:
- Ensure UTF-8 encoding
- Check for BOM (Byte Order Mark) issues
- Verify line ending format

### 5. Empty Response or Conditional Logic

**Problem**: PowerAutomate Logic App might return empty content or have conditional logic that prevents event generation.

**Check**:
- Logic App conditions and filters
- Data source availability
- Query parameters and logic

## Debugging Steps

### Step 1: Test URL Directly
1. Copy your PowerAutomate URL
2. Paste it directly into a browser
3. Verify it downloads a valid .ics file
4. Open the .ics file in a text editor and verify structure

### Step 2: Use Enhanced Test Endpoint
1. Go to FloHub Settings → Calendar Settings
2. Click "Add iCal Calendar"
3. Enter PowerAutomate URL
4. Click "Test URL" 
5. Review the detailed debugging information returned

### Step 3: Check Server Logs
Monitor the server console logs for PowerAutomate-specific debugging:
```
PowerAutomate URL detected, adding extra debugging...
PowerAutomate Debug: {
  status: 200,
  contentType: 'application/octet-stream',
  responseLength: 1234,
  hasVCalendar: true,
  responseStart: 'BEGIN:VCALENDAR\nVERSION:2.0...'
}
```

### Step 4: Validate iCal Content
Use online iCal validators to verify the content:
- [iCalendar.org Validator](https://icalendar.org/validator.html)
- Copy the response content and validate manually

## PowerAutomate Logic App Configuration

### Recommended Response Configuration

```json
{
  "type": "Response",
  "inputs": {
    "statusCode": 200,
    "headers": {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendar.ics"
    },
    "body": "@{variables('icalContent')}"
  }
}
```

### Sample iCal Generation in PowerAutomate

```json
{
  "type": "Initialize variable",
  "inputs": {
    "variables": [
      {
        "name": "icalContent",
        "type": "string",
        "value": "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PowerAutomate//NONSGML Calendar//EN\nBEGIN:VEVENT\nUID:@{guid()}@domain.com\nDTSTAMP:@{formatDateTime(utcNow(), 'yyyyMMddTHHmmssZ')}\nDTSTART:@{formatDateTime(variables('eventStart'), 'yyyyMMddTHHmmssZ')}\nDTEND:@{formatDateTime(variables('eventEnd'), 'yyyyMMddTHHmmssZ')}\nSUMMARY:@{variables('eventTitle')}\nDESCRIPTION:@{variables('eventDescription')}\nEND:VEVENT\nEND:VCALENDAR"
      }
    ]
  }
}
```

## Troubleshooting Checklist

- [ ] URL is accessible and returns HTTP 200
- [ ] Response contains `BEGIN:VCALENDAR` and `END:VCALENDAR`
- [ ] Content-Type header is set appropriately
- [ ] iCal structure is valid (use validator)
- [ ] Events are within the date range being queried
- [ ] PowerAutomate Logic App has events to return
- [ ] No authentication required for the URL
- [ ] Character encoding is UTF-8
- [ ] Line endings are consistent

## Enhanced Debugging Output

The enhanced test endpoint now returns comprehensive debugging information:

```json
{
  "success": true,
  "eventCount": 0,
  "upcomingEvents": 0,
  "calendarInfo": {},
  "responseInfo": {
    "status": 200,
    "statusText": "OK",
    "contentType": "application/octet-stream",
    "contentLength": "542",
    "responseLength": 542,
    "responsePreview": "BEGIN:VCALENDAR\nVERSION:2.0\n...",
    "headers": {
      "content-type": "application/octet-stream",
      "content-length": "542",
      "server": "Microsoft-IIS/10.0"
    }
  },
  "message": "Successfully parsed iCal feed with 0 total events (0 upcoming)"
}
```

## Next Steps

If the PowerAutomate URL still returns 0 events after following this guide:

1. **Share Debug Output**: Provide the complete responseInfo from the test endpoint
2. **Validate iCal Content**: Use external validators to confirm the iCal structure
3. **Check Date Ranges**: Ensure events fall within the current date range being queried
4. **Review Logic App Logic**: Verify the PowerAutomate Logic App is generating events correctly

This debugging framework provides comprehensive insights into why PowerAutomate iCal integration might fail and offers actionable solutions for each common issue.