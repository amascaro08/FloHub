# Dashboard Direct Access Bug Fix

## Problem Summary

There was a critical bug where users attempting to directly access `flohub.xyz/dashboard` or `flohub.vercel.app/dashboard` would receive a "page can't connect" error instead of being properly redirected to the login page or accessing the dashboard if authenticated. However, navigation through the side menu worked correctly.

## Root Cause Analysis

The issue was caused by **inconsistent cookie domain handling** in the authentication system:

### 1. Cookie Domain Mismatch
- The authentication APIs (`login.ts`, `refresh.ts`, `logout.ts`) were using the older `setCookie` and `clearCookie` functions from `lib/auth.ts`
- These functions did not set proper domain attributes for cookies
- Without proper domain configuration, cookies were only accessible from the exact hostname they were set on

### 2. Cross-Subdomain Cookie Issues
- Cookies set without domain configuration couldn't be shared between `flohub.xyz` and `www.flohub.xyz`
- Direct URL access failed because the middleware couldn't read the authentication cookie due to domain restrictions
- Side menu navigation worked because the page was already loaded and authentication state was managed client-side

### 3. Available but Unused Solution
- The codebase already had proper cookie utilities in `lib/cookieUtils.ts` with `createSecureCookie` and `createClearCookie` functions
- These utilities include proper domain detection via `getCookieDomain()` function
- They set cookies with `.flohub.xyz` domain for cross-subdomain support
- However, the authentication endpoints were still using the old cookie functions

## Solution Implemented

### Updated Authentication Endpoints

#### 1. Login API (`pages/api/auth/login.ts`)
**Before:**
```typescript
import { signToken, setCookie } from '@/lib/auth';
// ...
setCookie(res, 'auth-token', token, maxAge, req);
```

**After:**
```typescript
import { signToken } from '@/lib/auth';
import { createSecureCookie } from '@/lib/cookieUtils';
// ...
const authCookie = createSecureCookie(req, 'auth-token', token, {
  maxAge,
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'
});
res.setHeader('Set-Cookie', authCookie);
```

#### 2. Refresh API (`pages/api/auth/refresh.ts`)
**Before:**
```typescript
import { auth, signToken, setCookie } from '@/lib/auth';
// ...
setCookie(res, 'auth-token', token, 30 * 24 * 60 * 60, req);
```

**After:**
```typescript
import { auth, signToken } from '@/lib/auth';
import { createSecureCookie } from '@/lib/cookieUtils';
// ...
const authCookie = createSecureCookie(req, 'auth-token', token, {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'
});
res.setHeader('Set-Cookie', authCookie);
```

#### 3. Logout API (`pages/api/auth/logout.ts`)
**Before:**
```typescript
import { clearCookie } from '@/lib/auth';
// ...
clearCookie(res, 'auth-token', req);
```

**After:**
```typescript
import { createClearCookie } from '@/lib/cookieUtils';
// ...
const clearAuthCookie = createClearCookie(req, 'auth-token');
res.setHeader('Set-Cookie', clearAuthCookie);
```

### 4. Fixed MainLayout Public Paths
Updated `components/ui/MainLayout.tsx` to include `/feedback` in the public paths list for consistency with middleware.

### Key Improvements

#### 1. Proper Domain Handling
- Cookies are now set with `.flohub.xyz` domain for production
- This enables cross-subdomain access between `flohub.xyz` and `www.flohub.xyz`
- Vercel deployments use subdomain-specific cookies as appropriate

#### 2. Enhanced Security
- Proper `HttpOnly`, `Secure`, and `SameSite` attributes
- Production environment uses secure cookies
- Development environment remains flexible for testing

#### 3. Consistent Cookie Management
- All authentication endpoints now use the same cookie utilities
- Consistent domain detection logic across the application
- Proper cookie clearing that matches the setting logic

## Current Status

✅ **Build Fixed**: Application builds successfully without TypeScript errors  
⚠️ **Issue Persists**: User reports the direct dashboard access issue still occurs

## Next Steps for Debugging

Since the cookie domain fix didn't resolve the issue, the problem might be:

1. **API Endpoint Failure**: The `/api/auth/session` endpoint might be failing completely
2. **Database Connection**: Issues with user lookup or database connectivity
3. **Environment Variables**: Missing JWT_SECRET or other configuration
4. **Infinite Redirect Loop**: Middleware logic causing redirect loops
5. **CORS Issues**: Cross-origin request problems

### Available Debug Tools

The codebase now includes:
- `/api/debug/auth-test` - Comprehensive authentication debugging endpoint
- Enhanced error handling in authentication flow
- Better cookie domain detection

### Recommended Testing Steps

1. **Test the debug endpoint**: Visit `/api/debug/auth-test` to check authentication status
2. **Check browser console**: Look for JavaScript errors or failed network requests
3. **Check network tab**: Look for failed API calls or 500 errors
4. **Clear browser cookies**: Ensure no stale cookies are interfering
5. **Test different browsers**: Check if the issue is browser-specific

## Files Modified

- `pages/api/auth/login.ts` - Updated to use `createSecureCookie`
- `pages/api/auth/refresh.ts` - Updated to use `createSecureCookie`
- `pages/api/auth/logout.ts` - Updated to use `createClearCookie`
- `components/ui/MainLayout.tsx` - Added `/feedback` to public paths
- `pages/api/debug/auth-test.ts` - Added comprehensive debugging endpoint

## Technical Details

The fix leverages the existing `lib/cookieUtils.ts` infrastructure:

```typescript
// Automatic domain detection
function getCookieDomain(req: NextApiRequest): string | undefined {
  const host = req.headers.host;
  
  if (process.env.NODE_ENV !== 'production') {
    return undefined; // No domain restriction for development
  }
  
  if (host?.includes('flohub.xyz')) {
    return '.flohub.xyz'; // Works for both flohub.xyz and www.flohub.xyz
  }
  
  if (host?.includes('vercel.app')) {
    return undefined; // Vercel subdomains don't need explicit domain
  }
  
  return undefined;
}
```

This ensures proper cookie behavior across all deployment environments while maintaining security best practices.

## Important Note

While the cookie domain fix was necessary and important for proper authentication flow, the user reports that the "page can't connect" error persists. This suggests the root cause may be different than initially diagnosed. Further investigation using the debug tools is recommended to identify the actual issue.