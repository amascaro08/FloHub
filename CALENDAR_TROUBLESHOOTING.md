# Calendar Troubleshooting Guide

## Overview
This guide helps diagnose and fix common calendar integration issues in the application.

## Quick Diagnosis
Visit `/calendar/debug` in your browser to get a comprehensive overview of your calendar setup and any issues.

## Common Issues and Solutions

### 1. "Failed to load" Error on Calendar Page

**Symptoms:**
- Calendar page shows "failed to load" message
- No events display despite having calendar sources configured

**Solutions:**

#### Check Google Calendar Connection
1. Go to **Settings > Calendar**
2. Look for the connection status indicator
3. If Google Calendar shows "Not Connected":
   - Click "Add Google Calendar"
   - Complete the OAuth authorization
   - Return to calendar page and refresh

#### Verify Environment Variables
Ensure these environment variables are set:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=https://your-domain.com
```

#### Check Token Expiration
- Google tokens expire and need refresh
- The app automatically attempts to refresh expired tokens
- If refresh fails, you'll need to reconnect your Google account

### 2. Power Automate URL Not Working

**Symptoms:**
- Work calendar events not showing
- O365 integration failing

**Solutions:**

#### Test Your URL
1. In **Settings > Calendar**, find your Power Automate URL
2. Click "Test URL" to verify it's working
3. Ensure the URL:
   - Returns JSON data
   - Is accessible from the internet
   - Uses HTTPS (recommended)

#### URL Format Examples
```
https://prod-xx.westus.logic.azure.com:443/workflows/xxx/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xxx
```

#### Common Power Automate Issues
- **CORS errors**: Ensure your Power Automate flow allows cross-origin requests
- **Authentication**: Make sure the flow doesn't require additional authentication
- **Data format**: The response should be an array of events or an object with an `events` property

### 3. Calendar Sources Not Configuring Correctly

**Symptoms:**
- Can't add calendar sources
- Sources show as disabled
- Settings not saving

**Solutions:**

#### Convert Legacy Settings
If you have an old Power Automate URL:
1. Go to **Settings > Calendar**
2. Look for "Legacy Power Automate URL" section
3. Click "Convert to Calendar Source"

#### Enable Calendar Sources
1. In **Settings > Calendar**, find your calendar sources
2. Toggle the switch to "Enabled" for each source you want to use
3. Verify tags are set correctly (work/personal)

#### Check Source Configuration
- **Google sources**: Require OAuth connection
- **O365 sources**: Require valid Power Automate URL
- **Tags**: Used to categorize events as work/personal

### 4. OAuth Issues

**Symptoms:**
- Redirects to login page instead of settings
- "Not signed in" errors during OAuth flow
- Can't complete Google Calendar connection

**Solutions:**

#### Clear Browser Data
1. Clear cookies and local storage for your domain
2. Log out and log back in
3. Try the OAuth flow again

#### Check Redirect URLs
Ensure your Google OAuth app has these redirect URLs configured:
```
https://your-domain.com/api/auth/callback/google
https://your-domain.com/api/auth/callback/google-additional
```

#### Environment Setup
Verify OAuth environment variables:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=https://your-domain.com
JWT_SECRET=your_jwt_secret
```

## Debugging Tools

### Calendar Debug Page
Visit `/calendar/debug` to see:
- Authentication status
- Google Calendar connection status
- Environment configuration
- API status codes
- Calendar sources configuration
- Detailed error messages

### Console Logs
Check browser console for:
- Network request errors
- JavaScript errors
- API response details

### API Testing
Test individual endpoints:
```bash
# User settings
GET /api/userSettings

# Calendar list (Google)
GET /api/calendar/list

# Calendar events
GET /api/calendar?timeMin=2024-01-01T00:00:00.000Z&timeMax=2024-01-31T23:59:59.999Z&useCalendarSources=true
```

## Step-by-Step Setup Guide

### Google Calendar Setup
1. **Create Google OAuth App**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Add redirect URLs

2. **Configure Environment**:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

3. **Connect in App**:
   - Go to Settings > Calendar
   - Click "Add Google Calendar"
   - Complete OAuth flow
   - Verify connection status

### Power Automate Setup
1. **Create Power Automate Flow**:
   - Use "When an HTTP request is received" trigger
   - Add calendar data source (Outlook, etc.)
   - Return JSON array of events
   - Copy the HTTP POST URL

2. **Add to App**:
   - Go to Settings > Calendar
   - Click "Add Power Automate URL"
   - Paste your flow URL
   - Click "Test URL" to verify

3. **Event Format**:
   ```json
   [
     {
       "title": "Meeting Title",
       "startTime": "2024-01-15T10:00:00Z",
       "endTime": "2024-01-15T11:00:00Z",
       "description": "Meeting description"
     }
   ]
   ```

## API Reference

### Calendar Events Response Format
```typescript
interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  description?: string;
  calendarId?: string;
  source?: "personal" | "work";
  calendarName?: string;
  tags?: string[];
}
```

### Error Codes
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Calendar/event not found
- **429**: Rate limit exceeded
- **500**: Server error

## Support

If you continue to have issues:
1. Check the debug page at `/calendar/debug`
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Test API endpoints individually
5. Check Google Cloud Console for API quotas and errors

## Recent Fixes Applied

### Version 2024.01
- ✅ Improved token refresh logic for Google Calendar
- ✅ Better error handling and user feedback
- ✅ Enhanced Power Automate URL validation
- ✅ Added comprehensive debug tools
- ✅ Fixed calendar sources configuration issues
- ✅ Improved OAuth redirect handling
- ✅ Added connection status indicators