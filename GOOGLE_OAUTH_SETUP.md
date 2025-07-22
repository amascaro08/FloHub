# Google OAuth Setup for Calendar Integration

## 🔧 **Issue Fixed**
The "404 Not Found" error after Google OAuth was caused by an incorrect redirect URI configuration. 

### **Problem:**
- OAuth redirect URI was using `process.env.GOOGLE_REDIRECT_URI` 
- This environment variable wasn't matching the actual callback endpoint
- Google was redirecting to a non-existent URL

### **Solution Applied:**
- Updated `/api/calendar/connect.ts` to use the existing robust OAuth configuration
- Now uses `getGoogleOAuthUrl()` from `lib/googleMultiAuth.ts` 
- Properly routes to `/api/auth/callback/google-additional`

## 🔑 **Required Google Cloud Console Setup**

### **1. Create/Configure OAuth 2.0 Client**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Enable **Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"

### **2. Configure Authorized Redirect URIs**

**CRITICAL:** Add these exact URLs to your OAuth client:

#### For Production (Vercel):
```
https://your-domain.vercel.app/api/auth/callback/google-additional
```

#### For Development:
```
http://localhost:3000/api/auth/callback/google-additional
```

### **3. Required Environment Variables**

Set these in your deployment platform (Vercel) and locally:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# OR alternatively (the app supports both):
GOOGLE_OAUTH_ID=your_google_client_id_here
GOOGLE_OAUTH_SECRET=your_google_client_secret_here

# Your app's base URL
NEXTAUTH_URL=https://your-domain.vercel.app
# For development: NEXTAUTH_URL=http://localhost:3000
```

## 🔄 **OAuth Flow After Fix**

### **Working Flow:**
1. User clicks "Connect Google Calendar" in settings
2. → Redirects to `/api/calendar/connect?provider=google`
3. → Generates proper OAuth URL with user state
4. → Redirects to Google OAuth consent screen
5. → User authorizes calendar access
6. → Google redirects to `/api/auth/callback/google-additional`
7. → Callback exchanges code for tokens
8. → Stores tokens in database
9. → Creates calendar source in user settings
10. → Redirects to `/dashboard/settings?tab=calendar&success=google_connected`

### **Success Indicators:**
- User sees success message in settings
- Calendar debug page shows "Connected" status
- Calendar sources list shows "Google Calendar"
- Calendar events start appearing

## 🛠 **Files Modified**

### **`pages/api/calendar/connect.ts`**
```typescript
// Before (broken):
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // ❌ Wrong/missing variable
);

// After (fixed):
import { getGoogleOAuthUrl } from "@/lib/googleMultiAuth";
const url = getGoogleOAuthUrl(state); // ✅ Uses robust configuration
```

### **Key Improvements:**
- ✅ Uses existing, tested OAuth configuration
- ✅ Proper error handling and logging
- ✅ Consistent redirect URI across environments
- ✅ State parameter includes user email for proper callback handling

## 🧪 **Testing the Fix**

### **1. Verify Environment Variables**
Check that these are set in your deployment:
- `GOOGLE_CLIENT_ID` or `GOOGLE_OAUTH_ID`
- `GOOGLE_CLIENT_SECRET` or `GOOGLE_OAUTH_SECRET`  
- `NEXTAUTH_URL`

### **2. Test OAuth Flow**
1. Go to Settings → Calendar
2. Click "Connect Google Calendar"
3. Should redirect to Google OAuth (not 404)
4. Complete authorization
5. Should return to settings with success message

### **3. Verify Connection**
- Check `/calendar/debug` page
- Should show Google Calendar as "Connected"
- Calendar events should load in main calendar view

## 🚨 **Common Issues & Solutions**

### **"Invalid redirect_uri" Error**
- **Cause:** Redirect URI not added to Google OAuth client
- **Fix:** Add exact URL to Google Cloud Console OAuth configuration

### **"OAuth client not found" Error**
- **Cause:** Incorrect Client ID or Client Secret
- **Fix:** Double-check environment variables match Google Console

### **"Access denied" Error**
- **Cause:** User denied calendar permissions
- **Fix:** Ensure your OAuth request includes correct scopes:
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/calendar.events`

### **Still Getting 404**
- **Cause:** Environment variables not deployed
- **Fix:** Redeploy with proper environment variables set

## ✅ **Deployment Checklist**

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] OAuth 2.0 client configured
- [ ] Redirect URIs added to OAuth client
- [ ] Environment variables set in deployment
- [ ] App deployed with latest code
- [ ] OAuth flow tested end-to-end

## 🔍 **Debug Information**

The app includes a comprehensive debug page at `/calendar/debug` that shows:
- Authentication status
- Google Calendar connection status
- Environment configuration status
- API response codes
- Detailed error messages

Use this page to diagnose any remaining issues after deployment.