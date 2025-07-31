# PWA Update System

This document explains the PWA (Progressive Web App) update system implemented in FloHub to ensure users always get the latest version of the app.

## Overview

The PWA update system provides:
- **Automatic update detection** - Checks for new versions when the app loads
- **User-friendly update prompts** - Shows a notification when updates are available
- **One-click updates** - Users can update with a single click
- **Version-based cache busting** - Ensures new deployments trigger updates
- **Background update checking** - Automatically checks for updates every 30 minutes

## How It Works

### 1. Version Management
- Each deployment automatically updates the service worker version
- Version format: `vYYYY.MM.DD.HHMM` (e.g., `v2024.01.15.1430`)
- This forces cache invalidation and triggers update detection

### 2. Update Detection
- Service worker checks for updates on app load
- Background checks every 30 minutes
- Detects when new service worker is installed

### 3. User Experience
- Shows a non-intrusive update notification
- Users can update immediately or dismiss the notification
- Smooth update process with loading states

## Components

### PWAUpdateManager
Located in `components/ui/PWAUpdateManager.tsx`
- Displays update notification
- Handles update actions
- Provides dismiss functionality

### usePWAUpdate Hook
Located in `hooks/usePWAUpdate.ts`
- Manages update state
- Provides update functions
- Handles service worker communication

### Service Worker
Located in `public/sw.js`
- Handles caching and updates
- Manages version-based cache busting
- Processes update messages

## Deployment Process

### Automatic Deployment
```bash
# Use the deployment script (recommended)
./scripts/deploy-pwa.sh

# Or use npm scripts
npm run build:pwa
```

### Manual Deployment
```bash
# 1. Update PWA version
npm run pwa:update-version

# 2. Build the app
npm run build

# 3. Deploy to your hosting platform
```

## User Experience

### Update Notification
When an update is available, users see:
- A notification in the bottom-right corner
- Clear explanation of what's new
- "Update Now" and "Later" buttons
- Loading state during update

### Update Process
1. User clicks "Update Now"
2. Service worker receives update message
3. New service worker activates
4. Page reloads with new version
5. User sees updated app

## Configuration

### Service Worker Settings
In `public/sw.js`:
```javascript
const CACHE_VERSION = 'v1.0.0'; // Auto-updated on deployment
const CACHE_NAME = `flohub-${CACHE_VERSION}`;
```

### Update Check Interval
In `hooks/usePWAUpdate.ts`:
```javascript
// Auto-check for updates every 30 minutes
const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
```

## Troubleshooting

### Update Not Showing
1. Check browser console for errors
2. Verify service worker is registered
3. Clear browser cache and reload
4. Check if PWA is installed (updates work differently)

### Update Failing
1. Check network connectivity
2. Verify service worker file is accessible
3. Check browser console for errors
4. Try manual page reload

### Cache Issues
1. Clear browser cache
2. Uninstall and reinstall PWA
3. Check service worker cache in DevTools

## Best Practices

### For Developers
1. Always use the deployment script for consistency
2. Test updates in development before deploying
3. Monitor update success rates
4. Keep service worker code minimal and focused

### For Users
1. Accept updates when prompted
2. Keep the app open for background updates
3. Report any update issues
4. Clear cache if experiencing issues

## Technical Details

### Cache Strategy
- **HTML pages**: Network-first with cache fallback
- **Static assets**: Cache-first with network fallback
- **API calls**: Network-only (no caching)
- **Auth routes**: Network-only (no caching)

### Update Flow
1. Service worker detects new version
2. Downloads new service worker
3. Installs in background
4. Notifies main thread
5. Shows update prompt
6. User triggers update
7. Service worker activates
8. Page reloads with new version

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited support (iOS Safari has restrictions)
- Mobile browsers: Varies by platform

## Monitoring

### Update Metrics
Track these metrics to ensure update system is working:
- Update detection rate
- Update acceptance rate
- Update success rate
- Time to update completion

### Debugging
Use browser DevTools:
1. Application tab → Service Workers
2. Check service worker status
3. View cache contents
4. Monitor update events

## Future Enhancements

### Planned Features
- Update changelog display
- Progressive updates (partial updates)
- Offline update preparation
- Update scheduling
- A/B testing for updates

### Potential Improvements
- More granular cache control
- Background sync for updates
- Update rollback capability
- Update analytics dashboard