# IMMEDIATE FIX STEPS - FloHub Domain & Authentication Issues

## 🚨 **CONFIRMED ISSUES**

✅ **Diagnosis Complete:** The verification script confirms:

1. **Domain Redirect Issue**: `flohub.xyz` → redirects (308) to `www.flohub.xyz`
2. **Working Domain**: `www.flohub.xyz` serves the app correctly (200 OK)
3. **Authentication Broken**: Mismatched domain configuration
4. **Environment Variables**: Missing in current environment (local)

## 🔧 **EXACT FIX STEPS**

### Step 1: Update Vercel Environment Variables
🎯 **Priority: CRITICAL**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your FloHub project
3. Go to **Settings** → **Environment Variables**
4. Update/Add this variable:
   ```
   NEXTAUTH_URL=https://www.flohub.xyz
   ```
   ⚠️ **Important**: Use `www.flohub.xyz` (not `flohub.xyz`) since that's the serving domain

### Step 2: Update Google Cloud Console
🎯 **Priority: CRITICAL**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID for FloHub
4. In **Authorized redirect URIs**, add/update:
   ```
   https://www.flohub.xyz/api/auth/callback/google-additional
   ```
5. Remove any old URIs that use `flohub.xyz` (without www)
6. **Save** the changes

### Step 3: Redeploy Application
🎯 **Priority: HIGH**

1. In Vercel Dashboard, go to **Deployments**
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete

### Step 4: Test Authentication Flow
🎯 **Priority: HIGH**

1. Visit `https://www.flohub.xyz`
2. Try to login with your credentials
3. Test Google Calendar connection in Settings

## 🎯 **ALTERNATIVE SOLUTION (Better Long-term)**

If you prefer `flohub.xyz` as the main domain:

### Option A: Configure Vercel Domain Settings
1. In Vercel Dashboard → **Settings** → **Domains**
2. Set `flohub.xyz` as **Primary** (not redirect)
3. Set `www.flohub.xyz` to redirect to `flohub.xyz`
4. Keep `NEXTAUTH_URL=https://flohub.xyz`
5. Update Google OAuth URI to `https://flohub.xyz/api/auth/callback/google-additional`

## 📊 **VERIFICATION CHECKLIST**

After making changes, verify:

- [ ] `https://flohub.xyz` accessibility
- [ ] `https://www.flohub.xyz` loads the app
- [ ] Login functionality works
- [ ] Google Calendar connection works  
- [ ] Session persistence works
- [ ] No console errors in browser dev tools

## 🚀 **Expected Results**

After implementing the fix:

1. **Domain Access**: Both domains should work (one redirects to the other)
2. **Authentication**: Login should work without infinite redirects
3. **Google Calendar**: OAuth should complete successfully
4. **Session Management**: Users should stay logged in

## 🆘 **If Issues Persist**

1. **Check Browser Console**: Look for CORS, cookie, or redirect errors
2. **Verify Environment Variables**: Ensure they're set in production
3. **Check Google OAuth Settings**: Verify redirect URIs match exactly
4. **Test in Incognito**: Rule out browser cache issues

## 📞 **Need Help?**

If you need assistance:
1. Share screenshots of Vercel environment variables
2. Share screenshots of Google Cloud OAuth settings
3. Share any console errors from browser dev tools

## 🎯 **TLDR - Quick Fix**

**Most Likely Solution:**
1. Set `NEXTAUTH_URL=https://www.flohub.xyz` in Vercel
2. Update Google OAuth URI to `https://www.flohub.xyz/api/auth/callback/google-additional`
3. Redeploy
4. Test login