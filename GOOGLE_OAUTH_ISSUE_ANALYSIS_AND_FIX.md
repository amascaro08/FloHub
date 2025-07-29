# Google Calendar OAuth Issue - Root Cause Analysis & Fix

## 🔍 **Problem Summary**

You have reported that:
- ✅ `amascaro08@gmail.com` - Google Calendar works perfectly
- ❌ `flohubofficial@gmail.com` - OAuth succeeds but no calendar sources created
- ❌ Another user also experiencing the same issue

## 🎯 **Root Cause Identified**

After analyzing the codebase, this is a **classic OAuth callback vs Calendar Sources disconnect issue**:

1. ✅ **OAuth Flow Succeeds** → Google account is saved to `accounts` table
2. ✅ **Settings Show "Connected"** → Because OAuth account exists  
3. ❌ **Calendar Source Creation Fails** → No sources in `user_settings.calendar_sources`
4. ❌ **No Events Display** → Because there are no sources to fetch from

### **Why This Happens**

The issue occurs in the OAuth callback (`pages/api/auth/callback/google-additional.ts`) at lines 185-280 where:

1. The callback tries to fetch Google calendars using the access token
2. It then attempts to save calendar sources via the userSettings API
3. **Something in this process fails silently** for certain users
4. The OAuth account is saved, but calendar sources are not created

### **Specific Failure Points**

Looking at the code, the failure likely occurs at one of these steps:

1. **Calendar List Fetch Fails** (lines 149-157) - API call to Google fails
2. **UserSettings API Call Fails** (lines 191-219) - Internal API call fails  
3. **Calendar Sources Save Fails** (lines 208-219) - Database update fails
4. **Network/Timeout Issues** - Request takes too long and fails

## 🛠️ **Immediate Fix Solution**

Your codebase already has comprehensive tools to fix this issue! Here's how to fix it:

### **Option 1: Use Web Interface (Recommended)**

1. **For `flohubofficial@gmail.com`:**
   - Log into the account
   - Go to **Settings → Calendar**
   - Look for "Google Calendar Connected" status
   - Click **"Refresh Sources"** button (should be visible)
   - Wait for success message
   - Refresh the page to see calendar sources

### **Option 2: Use Command Line Tool** 

Your app has a built-in fix script:

```bash
# Diagnose the issue first
npm run fix-google-calendar flohubofficial@gmail.com --diagnose-only

# Apply the fix
npm run fix-google-calendar flohubofficial@gmail.com --force-refresh
```

### **Option 3: Use API Endpoint**

Call the refresh sources API directly:

```bash
curl -X POST https://your-domain.com/api/calendar/refresh-sources \
  -H "Authorization: Bearer USER_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

## 🔧 **Technical Fix Details**

The fix works by:

1. **Validating OAuth Account** - Ensures Google account exists and token is valid
2. **Fetching Google Calendars** - Calls Google Calendar API to get available calendars
3. **Creating Calendar Sources** - Converts Google calendars into app calendar sources
4. **Updating User Settings** - Saves the sources to the database

### **Code Location: `pages/api/calendar/refresh-sources.ts`**

This API endpoint (lines 74-98) does exactly what the OAuth callback should have done:

```typescript
// Fetch Google calendars
const calendarResponse = await fetch(
  "https://www.googleapis.com/calendar/v3/users/me/calendarList",
  { headers: { Authorization: `Bearer ${googleAccount.access_token}` } }
);

// Create calendar sources
const newGoogleSources: CalendarSource[] = calendars.map((calendar: any, index: number) => ({
  id: `google_${calendar.id}_${Date.now() + index}`,
  name: calendar.summary || calendar.id,
  type: "google" as const,
  sourceId: calendar.id,
  tags: calendar.id === "primary" ? ["personal"] : ["shared"],
  isEnabled: true,
}));

// Update user settings
await db.update(userSettings)
  .set({ calendarSources: updatedSources })
  .where(eq(userSettings.user_email, user.email));
```

## 🚨 **Why One Account Works and Others Don't**

Several possible reasons:

1. **Timing Issues** - The working account was connected during a period when the servers were more responsive
2. **API Rate Limits** - Google Calendar API may have been rate-limited for subsequent requests
3. **Network Timeouts** - OAuth callback has stricter timeouts than the refresh API
4. **Token Scope Differences** - Different OAuth consent flows may grant different permissions
5. **Concurrent Requests** - Multiple users authenticating simultaneously causing conflicts

## 🔍 **Verification Steps**

After applying the fix:

1. **Check Settings Page**
   - Should show "Google Calendar Connected" ✅
   - Should list Google calendar sources in "Calendar Sources" section
   - Each source should have toggle switches and be "Enabled"

2. **Check Calendar Page**
   - Should display events from Google Calendar
   - Events should have appropriate tags (personal/work)

3. **Check Debug Page** (if available)
   - Visit `/calendar/debug`
   - Should show Google Calendar as connected
   - Should show event counts > 0 for Google sources

## 🛡️ **Permanent Prevention**

To prevent this issue for future users:

### **1. Improve OAuth Callback Resilience**

Add retry logic to the OAuth callback:

```typescript
// In pages/api/auth/callback/google-additional.ts
// Add retry mechanism for calendar source creation
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const updateRes = await fetch(`${baseUrl}/api/userSettings/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: req.headers.cookie || "" },
      body: JSON.stringify({ ...userSettings, calendarSources: updatedSources }),
      timeout: 10000 // 10 second timeout
    });
    
    if (updateRes.ok) break;
    if (attempt === 2) throw new Error('Failed after 3 attempts');
  } catch (error) {
    console.log(`Attempt ${attempt + 1} failed, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### **2. Add Monitoring**

Add logging to track OAuth vs Calendar Source creation rates:

```typescript
// Track success/failure rates
console.log('OAuth completion stats:', {
  oauthCompleted: true,
  sourcesCreated: newGoogleSources.length,
  sourcesExpected: calendarList.items.length,
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

### **3. Add User Notification**

Notify users when calendar sources are missing:

```typescript
// In calendar page load
if (hasGoogleAccount && googleSources.length === 0) {
  showNotification('Your Google Calendar is connected but no calendar sources were found. Click here to refresh.', {
    action: () => refreshCalendarSources()
  });
}
```

## ✅ **Next Steps**

1. **Immediate Action**: Use Option 1 or 2 above to fix `flohubofficial@gmail.com`
2. **Verify Fix**: Check that calendar events appear after the fix
3. **Apply to Other Users**: Use the same fix for any other affected accounts
4. **Monitor**: Keep an eye on future OAuth completions to ensure this doesn't happen again

The good news is that your codebase already has all the tools needed to fix this issue, and it's a well-documented problem with established solutions! 🎉