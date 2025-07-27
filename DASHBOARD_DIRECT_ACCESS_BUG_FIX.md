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

## Expected Results

After this fix:

### ✅ Direct Dashboard Access
- `flohub.xyz/dashboard` → Works correctly (redirects to login if not authenticated, shows dashboard if authenticated)
- `flohub.vercel.app/dashboard` → Works correctly
- `www.flohub.xyz/dashboard` → Works correctly

### ✅ Authentication Flow
- Login sets cookies with proper domain attributes
- Middleware can read cookies consistently across subdomains
- Authentication state persists across page refreshes and direct URL access

### ✅ Cross-Subdomain Compatibility
- Cookies work seamlessly between `flohub.xyz` and `www.flohub.xyz`
- No authentication loops or session loss
- Consistent behavior across all access methods

## Testing Recommendations

1. **Clear existing cookies** in your browser for the domain
2. **Test direct dashboard access** on both domains
3. **Verify login persistence** across page refreshes
4. **Test cross-subdomain navigation** between `flohub.xyz` and `www.flohub.xyz`

## Files Modified

- `pages/api/auth/login.ts` - Updated to use `createSecureCookie`
- `pages/api/auth/refresh.ts` - Updated to use `createSecureCookie`
- `pages/api/auth/logout.ts` - Updated to use `createClearCookie`

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