# PowerAutomate Logic App iCal Format Fix

## Issue Identified

Your PowerAutomate Logic App is returning **mixed JSON/iCal content** instead of pure iCal format. The response contains both iCal headers and JSON data:

```
BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FloHub Calendar Feed//EN\nCALSCALE:GREGORIAN\n{"ical":"BEGIN:VEVENT\\\\nUID:...
```

This explains why FloHub shows 0 events - the iCal parser cannot process the mixed format.

## Problem Analysis

**What's happening:**
- Your Logic App correctly sets `Content-Type: text/calendar`
- BUT the response body contains JSON with embedded iCal data
- The structure looks like: `BEGIN:VCALENDAR...{"ical":"BEGIN:VEVENT..."}`

**Why this happens:**
- Common mistake: returning a JSON object with an `ical` property instead of raw iCal text
- Incorrect Response action configuration in PowerAutomate
- Mixed concatenation of iCal headers with JSON data

## Solution: Fix Your PowerAutomate Logic App

### Step 1: Review Your Response Action

In your PowerAutomate Logic App, find the **Response** action and ensure it's configured correctly:

**❌ Incorrect (returns JSON with embedded iCal):**
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "text/calendar"
  },
  "body": {
    "ical": "@{variables('icalContent')}"
  }
}
```

**✅ Correct (returns pure iCal text):**
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "text/calendar; charset=utf-8"
  },
  "body": "@{variables('icalContent')}"
}
```

### Step 2: Fix the iCal Content Variable

Ensure your `icalContent` variable contains pure iCal text without JSON wrapping:

**❌ Incorrect:**
```
{
  "ical": "BEGIN:VCALENDAR\nVERSION:2.0\n..."
}
```

**✅ Correct:**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PowerAutomate//NONSGML Calendar//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:event1@domain.com
DTSTART:20241215T100000Z
DTEND:20241215T110000Z
SUMMARY:Event Title
DESCRIPTION:Event Description
END:VEVENT
END:VCALENDAR
```

### Step 3: Common PowerAutomate iCal Generation Pattern

Here's the correct approach for generating iCal content in PowerAutomate:

**1. Initialize iCal Content Variable:**
```json
{
  "type": "Initialize variable",
  "inputs": {
    "variables": [
      {
        "name": "icalContent",
        "type": "string",
        "value": "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//YourCompany//NONSGML Calendar//EN\nCALSCALE:GREGORIAN\n"
      }
    ]
  }
}
```

**2. For Each Event, Append to iCal:**
```json
{
  "type": "Append to string variable",
  "inputs": {
    "name": "icalContent",
    "value": "BEGIN:VEVENT\nUID:@{guid()}@domain.com\nDTSTAMP:@{formatDateTime(utcNow(), 'yyyyMMddTHHmmssZ')}\nDTSTART:@{formatDateTime(items('Apply_to_each')?['eventStart'], 'yyyyMMddTHHmmssZ')}\nDTEND:@{formatDateTime(items('Apply_to_each')?['eventEnd'], 'yyyyMMddTHHmmssZ')}\nSUMMARY:@{items('Apply_to_each')?['title']}\nDESCRIPTION:@{items('Apply_to_each')?['description']}\nEND:VEVENT\n"
  }
}
```

**3. Close the iCal Content:**
```json
{
  "type": "Append to string variable",
  "inputs": {
    "name": "icalContent",
    "value": "END:VCALENDAR"
  }
}
```

**4. Return Pure iCal Response:**
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

## Key Points to Remember

### ✅ Do This:
- Return raw iCal text directly in the Response body
- Use `@{variables('icalContent')}` directly, not wrapped in JSON
- Set `Content-Type: text/calendar; charset=utf-8`
- Ensure proper iCal line endings (`\n` or `\r\n`)

### ❌ Don't Do This:
- Don't wrap iCal content in JSON objects
- Don't use `{"ical": "..."}` structure
- Don't mix iCal headers with JSON data
- Don't return Content-Type as `application/json`

## Testing Your Fix

After fixing your PowerAutomate Logic App:

1. **Test the URL directly** in a browser - it should download a pure .ics file
2. **Check the file content** - it should start with `BEGIN:VCALENDAR` and contain no JSON
3. **Test in FloHub** - use the enhanced test endpoint to verify it works
4. **Validate with online tools** - use iCal validators to ensure proper format

## Example Complete Logic App Flow

```
1. Initialize variable: icalContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Company//Calendar//EN\nCALSCALE:GREGORIAN\n"

2. Get data from your source (SharePoint, SQL, etc.)

3. For each event:
   - Append VEVENT block to icalContent

4. Append "END:VCALENDAR" to icalContent

5. Response:
   - Status: 200
   - Headers: Content-Type: text/calendar; charset=utf-8
   - Body: @{variables('icalContent')}
```

## Validation

Once fixed, your PowerAutomate URL should:
- Return pure iCal text (no JSON)
- Start with `BEGIN:VCALENDAR`
- End with `END:VCALENDAR`
- Have proper `Content-Type: text/calendar` header
- Work successfully in FloHub's test endpoint

The enhanced debugging in FloHub will now detect this specific issue and provide guidance if it occurs again.