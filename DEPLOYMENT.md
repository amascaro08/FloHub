# Deployment Guide - Fixing Authentication Issues

## Problem
The deployed app at flohub.xyz is showing a login page instead of the index page and constantly refreshing due to authentication errors.

## Root Cause
The `JWT_SECRET` environment variable was not set in production, causing all authentication to fail.

## Solution

### 1. Set Environment Variables

You need to set the following environment variables in your production environment:

```bash
# Required for authentication
JWT_SECRET=1c7ab66319b955587d83e105ac8fa784a3fc5d98c247eb827e25d5cae8cda46c

# Environment
NODE_ENV=production

# Database URL (replace with your actual database URL)
NEON_DATABASE_URL=your_database_url_here
```

### 2. Generate a New JWT Secret (Recommended)

For production, generate a new JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deployment Platforms

#### Vercel
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the environment variables listed above
4. Redeploy your application

#### Netlify
1. Go to your Netlify dashboard
2. Navigate to Site settings > Environment variables
3. Add the environment variables listed above
4. Trigger a new deployment

#### Railway
1. Go to your Railway project
2. Navigate to Variables tab
3. Add the environment variables listed above
4. Redeploy your application

### 4. Verify Configuration

After setting the environment variables, you can verify the configuration by:

1. Visiting `/api/auth/debug` on your deployed site
2. Checking the browser console for authentication errors
3. Testing the login functionality

### 5. Additional Fixes Applied

The following code changes have been made to prevent redirect loops:

- **useAuthPersistence.ts**: Added checks to prevent redirects on public pages
- **MainLayout.tsx**: Added better error handling and redirect prevention
- **useUser.ts**: Improved error handling to prevent infinite retries
- **auth.ts**: Added JWT_SECRET validation
- **session.ts**: Added better error reporting

### 6. Testing

After deployment:

1. Clear your browser cache and cookies
2. Visit the site and check if the index page loads correctly
3. Try logging in to verify authentication works
4. Check browser console for any remaining errors

### 7. Monitoring

Monitor the following endpoints for debugging:
- `/api/auth/debug` - Shows authentication configuration
- `/api/auth/session` - Shows current session status

## Common Issues

1. **Still seeing login page**: Check that JWT_SECRET is set correctly
2. **Database connection errors**: Ensure NEON_DATABASE_URL is set
3. **Redirect loops**: Clear browser cache and cookies
4. **PWA issues**: Check that cookies are being set correctly for PWA mode

## Support

If issues persist after following these steps, check:
1. Browser console for specific error messages
2. Server logs for authentication errors
3. Network tab for failed API requests