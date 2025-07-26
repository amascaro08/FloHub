# Build Fix - isPWA Variable Reference Error

## 🚨 **Issue**
Build failed with TypeScript error:
```
Type error: Cannot find name 'isPWA'.
./pages/api/auth/login.ts:60:9
```

## 🔧 **Root Cause**
When updating the cookie management system, I removed the `isPWA` variable declaration but left the code that references it for PWA-specific headers.

## ✅ **Fix Applied**
Re-added the `isPWA` variable declaration in `pages/api/auth/login.ts`:

```typescript
// Check if this is a PWA request (moved from cookie utility for header logic)
const userAgent = req.headers['user-agent'] || '';
const isPWA = userAgent.includes('standalone') || req.headers['sec-fetch-site'] === 'none';
```

## 📋 **Files Modified**
- `pages/api/auth/login.ts` - Added back isPWA variable declaration

## ✅ **Status**
- Build error resolved
- PWA functionality maintained
- Cookie domain detection still working
- All security features preserved

The build should now complete successfully with the multi-domain cookie management working as intended.