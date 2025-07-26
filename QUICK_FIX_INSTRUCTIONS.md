# Quick Fix Instructions - FloHub Domain/Auth Issues

## 🚨 **Immediate Fix Required**

Since `www.flohub.xyz` is the working domain, we need to update the configuration to use it consistently.

## 🔧 **Steps to Fix**

### 1. Update Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Update this variable:
```
NEXTAUTH_URL=https://www.flohub.xyz
```

### 2. Update Google Cloud Console OAuth Settings
Go to Google Cloud Console → APIs & Services → Credentials → Your OAuth Client

Update the Authorized redirect URIs to:
```
https://www.flohub.xyz/api/auth/callback/google-additional
```

### 3. Deploy and Test
After making these changes:
1. Deploy the app (or it may auto-deploy after env var changes)
2. Test login at `https://www.flohub.xyz`
3. Test Google Calendar connection

## 🔍 **Verification Steps**

1. **Test Domain Access:**
   - `https://flohub.xyz` should redirect to `https://www.flohub.xyz` ✓
   - `https://www.flohub.xyz` should load the app ✓
   - `https://flohub.vercel.app` should work as backup ✓

2. **Test Authentication:**
   - Login should work on `www.flohub.xyz`
   - Google Calendar connection should work
   - Session should persist correctly

## 🎯 **Alternative: Make flohub.xyz Primary (Better Long-term)**

If you prefer to use `flohub.xyz` as the main domain:

### 1. In Vercel Dashboard:
- Go to Domains section
- Set `flohub.xyz` as the primary domain (not redirect)
- Set `www.flohub.xyz` to redirect to `flohub.xyz`

### 2. Keep Environment Variables as:
```
NEXTAUTH_URL=https://flohub.xyz
```

### 3. Update Google OAuth to:
```
https://flohub.xyz/api/auth/callback/google-additional
```

## 📊 **Current Status Summary**

| Domain | Status | Issue |
|--------|--------|-------|
| `flohub.xyz` | 308 Redirect | Redirects to www |
| `www.flohub.xyz` | 200 OK | Working |
| `flohub.vercel.app` | 200 OK | Working |

**Root Cause:** Domain mismatch between OAuth configuration and actual serving domain.

**Quick Fix:** Update NEXTAUTH_URL to match the serving domain (`www.flohub.xyz`)

**Better Fix:** Configure domain properly in Vercel to serve from `flohub.xyz` directly.