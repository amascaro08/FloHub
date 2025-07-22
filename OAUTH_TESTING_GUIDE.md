# OAuth Testing Guide - Debugging Google Calendar Connection

## 🔧 **Latest Fixes Applied**

### **1. Fixed Redirect URI Mismatch**
- **Issue**: Hardcoded `flohub.vercel.app` vs your actual domain `flohub.xyz`
- **Fix**: Now uses `NEXTAUTH_URL` environment variable consistently
- **Critical**: Your Google Cloud Console must have the **exact** redirect URI

### **2. Added Comprehensive Logging**
- OAuth initiation (`/api/calendar/connect`)
- OAuth callback (`/api/auth/callback/google-additional`)
- Token exchange process
- Database operations

### **3. Enhanced Error Tracking**
- Each step now has detailed logging
- Silent failures will now be visible in logs

## 🧪 **Testing Protocol**

### **Step 1: Verify Environment Variables**
Make sure these are set in Vercel:
```bash
NEXTAUTH_URL=https://flohub.xyz  # (or your exact domain)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### **Step 2: Verify Google Cloud Console**
**CRITICAL**: Your Google OAuth client must have this **exact** redirect URI:
```
https://flohub.xyz/api/auth/callback/google-additional
```
*(Replace `flohub.xyz` with your actual domain)*

### **Step 3: Deploy & Test**
1. Deploy the latest code
2. Go to Settings → Calendar
3. Click "Connect Google Calendar"
4. **Watch for these logs in Vercel:**

#### **Expected OAuth Initiation Logs:**
```
🔥 OAuth connect request started for provider: google
✅ User authenticated: your@email.com
🔄 Generating Google OAuth URL...
✅ State parameter created for user: your@email.com
✅ Google OAuth URL generated: https://accounts.google.com/o/oauth2/v2/auth...
🚀 Redirecting to Google OAuth...
```

#### **Expected Callback Logs (if Google calls our callback):**
```
🔥🔥🔥 GOOGLE OAUTH CALLBACK REACHED 🔥🔥🔥
Method: GET
URL: /api/auth/callback/google-additional?code=...&state=...
Query params: { code: "4/0Adeu5B...", state: "eyJ..." }
```

## 🔍 **Diagnostic Scenarios**

### **Scenario A: No Connect Logs**
**Symptoms**: No logs appear when clicking "Connect Google Calendar"
**Cause**: Frontend isn't calling the connect endpoint
**Solution**: Check browser network tab, verify button is working

### **Scenario B: Connect Logs But No Callback Logs**
**Symptoms**: See OAuth initiation logs but no callback logs
**Causes & Solutions**:

#### **1. Redirect URI Mismatch**
- **Check**: Google Cloud Console redirect URI
- **Fix**: Must match exactly: `https://yourdomain.com/api/auth/callback/google-additional`

#### **2. Google OAuth Client Issues**
- **Check**: Client ID/Secret are correct
- **Fix**: Verify environment variables match Google Console

#### **3. OAuth URL Generation Failed**
- **Check**: Logs for OAuth URL generation errors
- **Fix**: Based on specific error message

### **Scenario C: Callback Reached But Fails**
**Symptoms**: See callback logs but still get `oauth_failed`
**Solution**: Follow detailed callback logs to identify exact failure point

## 🎯 **Most Common Issues**

### **Issue 1: Domain Mismatch**
```
❌ Error getting tokens from Google: redirect_uri_mismatch
```
**Fix**: Update Google Cloud Console redirect URI to match your domain

### **Issue 2: Invalid Client Credentials**
```
❌ Error getting tokens from Google: invalid_client
```
**Fix**: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel

### **Issue 3: User Email Mismatch**
```
❌ User not found by email: different@email.com
```
**Fix**: Ensure OAuth email matches your login email

### **Issue 4: Environment Variable Missing**
```
❌ Google OAuth configuration is missing required parameters
```
**Fix**: Set all required environment variables in Vercel

## ✅ **Success Indicators**

### **Complete Success Flow:**
1. ✅ OAuth initiation logs appear
2. ✅ Google OAuth consent screen shows
3. ✅ Callback logs appear with code/state
4. ✅ Token exchange succeeds
5. ✅ User account created/updated in database
6. ✅ Calendar source added to user settings
7. ✅ Redirect to settings with success message
8. ✅ Settings page shows "Connected"
9. ✅ Calendar events appear

## 🚀 **Next Steps**

### **Deploy & Test:**
1. Deploy the updated code with logging
2. Test the OAuth flow
3. Check Vercel function logs for detailed output
4. If no callback logs appear → Focus on redirect URI configuration
5. If callback logs appear but fail → Share specific error logs

### **Share Logs:**
When reporting issues, please share:
- OAuth initiation logs (from `/api/calendar/connect`)
- OAuth callback logs (from `/api/auth/callback/google-additional`)
- Any error messages from Vercel function logs
- Your domain and Google Cloud Console redirect URI configuration

The extensive logging will now reveal exactly what's happening! 🔍