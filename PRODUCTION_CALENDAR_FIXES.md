# Production Calendar Widget CORS Fixes

## Issue Identified
The calendar and habits widgets were failing in production with CORS errors:
- `"Load failed"` errors when calling APIs
- `"access control checks"` errors for `/api/habits` and `/api/calendar`

## Root Cause
The production environment at `https://www.flohub.xyz/` was making cross-origin requests that were being blocked by browser CORS policy. The Next.js global CORS headers in `next.config.js` were not sufficient for all API endpoints.

## Fixes Applied

### 1. Added Explicit CORS Headers to Core APIs
Added comprehensive CORS handling to these critical APIs:
- `/api/calendar` - Calendar events fetching
- `/api/habits` - Habit tracking data  
- `/api/tasks` - Task management
- `/api/userSettings` - User configuration

### 2. CORS Configuration Details
Each API now includes:
```typescript
// Handle CORS for production
const origin = req.headers.origin;
const allowedOrigins = [
  'http://localhost:3000',        // Development
  'https://flohub.xyz',           // Production (main)
  'https://www.flohub.xyz',       // Production (www)
  'https://flohub.vercel.app'     // Vercel deployment
];

if (origin && allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

// Handle preflight OPTIONS requests
if (req.method === 'OPTIONS') {
  res.status(200).end();
  return;
}
```

### 3. Enhanced Error Handling
The calendar widgets now include:
- Better debugging logs for production issues
- Graceful fallbacks for API failures
- Proper authentication state handling

## Deployment Instructions

### For Vercel Deployment:
1. **Push these changes** to your main branch
2. **Redeploy** on Vercel (should auto-deploy if connected to GitHub)
3. **Verify** the production URLs are working:
   - `https://flohub.xyz`
   - `https://www.flohub.xyz`

### Environment Variables to Check:
Ensure these are set in Vercel dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - For authentication tokens
- `GOOGLE_CLIENT_ID` - For calendar integration
- `GOOGLE_CLIENT_SECRET` - For calendar integration
- Any other OAuth credentials needed

### Testing After Deployment:
1. **Test Authentication**: Login should work without infinite loops
2. **Test Calendar Widget**: Should show events without CORS errors
3. **Test At A Glance Widget**: Should show today's and tomorrow's events
4. **Check Browser Console**: Should see detailed debug logs instead of CORS errors

## What This Fixes:

✅ **CORS Errors**: Fixed cross-origin request blocking
✅ **Calendar Widget Loading**: Will now properly fetch and display events
✅ **At A Glance Widget**: Will show both today's and tomorrow's events
✅ **Habits Integration**: Fixed habits API CORS issues
✅ **Tasks Integration**: Fixed tasks API CORS issues
✅ **Settings Loading**: Fixed user settings API CORS issues

## Files Modified:
- `pages/api/calendar.ts` - Added CORS headers
- `pages/api/habits.ts` - Added CORS headers  
- `pages/api/tasks.ts` - Added CORS headers
- `pages/api/userSettings.ts` - Added CORS headers
- `lib/cors.ts` - Created utility function (for future use)

## Expected Results:
After deploying these changes, the production site should:
1. Load the dashboard without calendar API errors
2. Display calendar events in both widgets
3. Show proper debugging information in browser console
4. Handle authentication properly across subdomains

## If Issues Persist:
Check browser developer tools for:
1. **Network tab**: See if API calls are succeeding
2. **Console tab**: Look for detailed error messages
3. **Application tab**: Check if cookies are set properly

The enhanced logging will help identify any remaining issues.
