# Authentication Issue Fix - FloHub

## Problem Description

The FloHub app deployed at `flohub.xyz` was showing an infinite refresh loop where:
- Users visiting the homepage were redirected to login page
- The login page kept refreshing constantly
- Console errors showed 401 Unauthorized responses for `/api/auth/session` and `/api/auth/refresh`

## Root Causes Identified

### 1. Unnecessary Authentication Calls on Public Pages
- The `useUser()` and `useAuthPersistence()` hooks were being called for all pages, including public ones
- This caused authentication API calls for pages that should be publicly accessible
- The landing page (`/`) has `LandingPage.auth = false` but this wasn't being properly handled

### 2. Cookie Domain Mismatch
- Cookies were being set without a domain, defaulting to the exact hostname
- `www.flohub.xyz` couldn't access cookies set by `flohub.xyz` (or vice versa)
- This caused authentication to fail when accessing different subdomains

### 3. Missing Environment Variables (Potential)
- Production deployment might be missing required environment variables like `JWT_SECRET`

## Fixes Implemented

### 1. Conditional Authentication Logic
**Files Modified:**
- `/components/ui/MainLayout.tsx`
- `/pages/_app.tsx`
- `/lib/hooks/useAuthPersistence.ts`

**Changes:**
- Modified `MainLayout` to accept a `requiresAuth` prop
- Updated `_app.tsx` to check `Component.auth !== false` and pass this to `MainLayout`
- Made `useAuthPersistence` conditionally enabled based on authentication requirement
- Prevented unnecessary API calls for public pages

### 2. Cookie Domain Configuration
**Files Modified:**
- `/pages/api/auth/login.ts`
- `/pages/api/auth/refresh.ts`
- `/pages/api/auth/logout.ts`

**Changes:**
- Added `domain: '.flohub.xyz'` for production cookies to work across subdomains
- This allows cookies to work for both `flohub.xyz` and `www.flohub.xyz`

### 3. Debug Endpoint (Development Only)
**File Created:**
- `/pages/api/auth/debug.ts`

**Purpose:**
- Helps diagnose authentication issues in development
- Shows token presence, JWT secret availability, and cookie information

## Deployment Checklist

To ensure the fix works in production, verify:

### 1. Environment Variables
Ensure these are set in your Vercel/hosting dashboard:
```bash
JWT_SECRET=your-secure-jwt-secret
NEON_DATABASE_URL=your-database-url
NODE_ENV=production
```

### 2. Domain Configuration
- Ensure your hosting platform serves both `flohub.xyz` and `www.flohub.xyz`
- Consider setting up a redirect from one to the other for consistency
- Verify SSL certificates work for both domains

### 3. Database Connection
- Verify the database is accessible from production
- Check that user records exist and are properly formatted

## Testing the Fix

### Expected Behavior After Fix:
1. **Landing Page (`/`)**: Should load immediately without authentication calls
2. **Login Page**: Should work without refresh loops
3. **Protected Pages**: Should redirect to login if not authenticated
4. **Cross-subdomain**: Authentication should work on both `flohub.xyz` and `www.flohub.xyz`

### Browser Console:
- No more 401 errors on the landing page
- Authentication calls only happen on protected pages or after login

## Additional Recommendations

### 1. Domain Consistency
Consider setting up a redirect rule in your hosting config:
```javascript
// In next.config.js or hosting platform
{
  source: 'https://www.flohub.xyz/:path*',
  destination: 'https://flohub.xyz/:path*',
  permanent: true
}
```

### 2. Enhanced Error Handling
The auth endpoints now have better error handling and will log more specific error information in development.

### 3. Security Notes
- The `.flohub.xyz` domain cookie setting allows subdomains but maintains security
- All cookies remain `httpOnly` and `secure` in production
- JWT tokens still expire appropriately (24h or 30d based on "Remember Me")

## Monitoring

After deployment, monitor:
- Authentication success rates
- 401 error frequency
- User session persistence
- Landing page load performance

The fixes should resolve the infinite refresh loop and allow proper authentication flow across all pages and subdomains.