# Google Calendar OAuth Disconnect Issue - Complete Fix

## 🔍 **Problem Description**

You have a user whose settings show "Google Calendar is connected" but:
- ❌ Google Calendar doesn't appear as a calendar source
- ❌ No calendar events are displayed  
- ❌ Even after deleting cookies and user data, the issue persists
- ❌ OAuth flow completes successfully but sources aren't created

This is a **classic OAuth/Calendar Sources disconnect issue** where the OAuth authentication succeeds but the calendar source creation step fails.

## 🎯 **Root Cause**

The issue occurs when:
1. ✅ OAuth succeeds → Google account is saved to `accounts` table
2. ✅ Settings show "connected" → Because OAuth account exists
3. ❌ Calendar source creation fails → No sources in `user_settings.calendar_sources`
4. ❌ No events display → Because there are no sources to fetch from

## 🛠️ **Immediate Fix (For Current User)**

### Option 1: Use the Web Interface (Recommended)

1. **Go to Settings > Calendar**
2. **Look for the connection status** - it should show "Connected"
3. **Click "Refresh Sources"** instead of "Re-authenticate"
4. **Wait for the success message** showing calendars found
5. **Refresh the page** to see the new calendar sources

### Option 2: Use the Diagnostic Tool

Run this command to diagnose and fix the issue:

```bash
npm run fix-google-calendar user@example.com
```

**Diagnostic Only (no changes):**
```bash
npm run fix-google-calendar user@example.com --diagnose-only
```

**Force refresh all sources:**
```bash
npm run fix-google-calendar user@example.com --force-refresh
```

### Option 3: Manual Database Fix

If the above doesn't work, you can manually trigger the fix via API:

```bash
curl -X POST https://your-domain.com/api/calendar/refresh-sources \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json"
```

## 🔧 **Permanent Solution (Prevents Future Issues)**

### 1. Improved OAuth Callback Flow

The OAuth callback in `pages/api/auth/callback/google-additional.ts` has been enhanced with:
- ✅ Better error handling
- ✅ Verification of calendar source creation
- ✅ Retry logic for failed operations
- ✅ Comprehensive logging

### 2. New Manual Refresh API

Created `pages/api/calendar/refresh-sources.ts` that:
- ✅ Validates Google OAuth connection
- ✅ Fetches all available Google calendars
- ✅ Creates missing calendar sources
- ✅ Provides detailed feedback

### 3. Enhanced UI Controls

Updated calendar settings to include:
- ✅ "Refresh Sources" button for existing connections
- ✅ Better error messages and guidance
- ✅ Automatic page refresh after successful source creation

## 📊 **How to Verify the Fix**

### 1. Check User Status
```bash
npm run fix-google-calendar user@example.com --diagnose-only
```

Should show:
```
✅ User exists
✅ Has Google account  
✅ Has calendar sources
Google calendar sources: [number > 0]
```

### 2. Check Settings Page
- Go to **Settings > Calendar**
- Should show "Google Calendar Connected" with green checkmark
- Should list Google calendar sources in the "Calendar Sources" section
- Each source should have toggle switches and be "Enabled"

### 3. Check Calendar Page
- Go to main calendar page
- Should display events from Google Calendar
- Events should have appropriate tags (personal/work)

### 4. Check Debug Page
- Visit `/calendar/debug`
- Should show "Google Calendar Connected" as green
- Should show event counts > 0 for Google sources

## 🚨 **Common Failure Scenarios & Solutions**

### Scenario 1: "No Google account connected"
**Cause:** OAuth never completed successfully  
**Solution:** User needs to complete OAuth flow
```
Go to Settings > Calendar > Add Google Calendar
```

### Scenario 2: "Google token expired" 
**Cause:** Token expired and refresh failed  
**Solution:** Re-authenticate with Google
```
Go to Settings > Calendar > Re-authenticate
```

### Scenario 3: "No Google calendars found"
**Cause:** User's Google account has no calendars  
**Solution:** Create a calendar in Google Calendar first
```
1. Go to calendar.google.com
2. Create at least one calendar
3. Return to app and refresh sources
```

### Scenario 4: Sources created but no events
**Cause:** Calendar sources are disabled or incorrectly configured  
**Solution:** Check calendar source settings
```
1. Go to Settings > Calendar
2. Ensure Google sources are "Enabled"
3. Check that source tags match your view filters
```

## 🔄 **Prevention Steps**

### 1. Monitor OAuth Completion
Add monitoring to track OAuth success vs calendar source creation:
```javascript
// In OAuth callback
console.log('OAuth success rate:', {
  oauthCompleted: true,
  sourcesCreated: newGoogleSources.length,
  sourcesExpected: calendarList.items.length
});
```

### 2. Implement Health Checks
Regular checks for disconnected users:
```sql
-- Find users with OAuth but no calendar sources
SELECT u.email, 
       COUNT(a.id) as oauth_accounts,
       COUNT(CASE WHEN cs.value->>'type' = 'google' THEN 1 END) as google_sources
FROM users u
LEFT JOIN accounts a ON u.id = a."userId" AND a.provider = 'google'
LEFT JOIN user_settings us ON u.email = us.user_email
LEFT JOIN LATERAL jsonb_array_elements(us.calendar_sources) cs(value) ON true
GROUP BY u.email
HAVING COUNT(a.id) > 0 AND COUNT(CASE WHEN cs.value->>'type' = 'google' THEN 1 END) = 0;
```

### 3. Add User Notification
Notify users when their calendar sources are missing:
```javascript
// In calendar page load
if (hasGoogleAccount && googleSources.length === 0) {
  showNotification('Your Google Calendar is connected but no calendar sources were found. Click here to refresh.', {
    action: () => refreshCalendarSources()
  });
}
```

## 🧪 **Testing the Fix**

### Test Case 1: New User OAuth
1. Create new user account
2. Complete Google OAuth flow
3. Verify calendar sources are created automatically
4. Check that events appear on calendar page

### Test Case 2: Existing Broken User
1. Find user with OAuth but no sources
2. Use refresh sources API
3. Verify sources are created
4. Check that events appear

### Test Case 3: Expired Token
1. Manually expire a user's Google token
2. Use refresh sources API
3. Should get "reconnect" message
4. Complete re-authentication flow

## 🎯 **Success Metrics**

- ✅ OAuth completion rate matches calendar source creation rate
- ✅ Zero users with Google OAuth but no calendar sources
- ✅ User support tickets for "calendar not working" reduced to zero
- ✅ Calendar page load shows events immediately after OAuth

## 📞 **User Instructions (For Support)**

When a user reports Google Calendar not working:

1. **First, check their settings:**
   - "Go to Settings > Calendar"
   - "Do you see 'Google Calendar Connected'?"

2. **If connected but no sources:**
   - "Click the 'Refresh Sources' button"
   - "Wait for the success message"
   - "Refresh the page"

3. **If not connected:**
   - "Click 'Add Google Calendar'"
   - "Complete the Google authorization"
   - "You should see calendar sources appear automatically"

4. **If still having issues:**
   - "Try the 'Re-authenticate' button"
   - "This will refresh your Google connection"

This comprehensive fix addresses both the immediate issue and prevents it from happening to future users! 🎉