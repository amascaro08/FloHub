# Power Automate Sync Setup (No Vercel Pro Required)

This document explains how to achieve automatic Power Automate sync without requiring Vercel Pro cron jobs. The solution uses intelligent background syncing triggered by user activity.

## Available Options

### 1. Intelligent Background Sync (Recommended - No External Setup Required)

This solution automatically syncs Power Automate events based on user activity without requiring any external cron services or Vercel Pro.

**How it works:**
- When any user performs a Power Automate sync, it triggers background sync for other users who haven't synced in 6+ hours
- A React hook can be added to trigger sync on user activity (page visits, interactions)
- Manual trigger endpoint available for on-demand sync

**Setup:**
1. Add the `useBackgroundSync` hook to your main app component:

```tsx
import { useBackgroundSync } from '../hooks/useBackgroundSync';

function App() {
  const { triggerSync, isInProgress } = useBackgroundSync({
    enabled: true,
    intervalMinutes: 30, // Minimum time between sync attempts
    onSyncStart: () => console.log('Background sync started'),
    onSyncComplete: () => console.log('Background sync completed'),
    onSyncError: (error) => console.warn('Background sync error:', error)
  });

  // Your app components...
}
```

2. The system automatically syncs users in the background when:
   - Any user manually syncs their calendar
   - Users interact with the app (throttled to prevent spam)
   - Users return to the app tab after being away

**Manual trigger:**
- Call `/api/trigger-background-sync` endpoint
- Use the `triggerSync()` function from the hook

### 2. GitHub Actions

The GitHub Actions workflow runs automatically every 6 hours and is completely free for public repositories.

**Setup:**
1. The workflow file is already included at `.github/workflows/power-automate-sync.yml`
2. Add the following secrets to your GitHub repository:
   - `DATABASE_URL` - Your database connection string
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `CRON_SECRET` - A secret token for authentication (same as your app)

**To add secrets:**
1. Go to your GitHub repository
2. Click on "Settings" tab
3. Click on "Secrets and variables" → "Actions"
4. Click "New repository secret" and add each secret

**Manual triggering:**
You can manually trigger the sync by going to the "Actions" tab in your GitHub repository and clicking "Run workflow" on the "Power Automate Sync" workflow.

### 2. External Webhook Cron Services

Use free external cron services that can call your API endpoint via webhook.

**Recommended free services:**
- [cron-job.org](https://cron-job.org) - Free, reliable, easy to use
- [EasyCron](https://www.easycron.com) - Free tier available
- [Crontab.guru](https://crontab.guru) - For cron expression help

**Setup with cron-job.org:**
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create a new cron job with:
   - **URL:** `https://yourdomain.com/api/cron/power-automate-sync?secret=YOUR_CRON_SECRET`
   - **Schedule:** `0 */6 * * *` (every 6 hours)
   - **Method:** GET or POST
   - **Optional:** Add header `X-Webhook-Secret: YOUR_CRON_SECRET`

**Environment Variables Required:**
- `CRON_SECRET` - A secure random string for authentication

### 3. Local/Server Cron (Self-hosted)

If you're self-hosting, you can use system cron.

**Setup:**
1. Add to your crontab:
   ```bash
   # Run every 6 hours
   0 */6 * * * cd /path/to/your/app && npx tsx scripts/power-automate-cron.ts
   ```

2. Or use the API endpoint:
   ```bash
   # Add to crontab
   0 */6 * * * curl -X POST "https://yourdomain.com/api/cron/power-automate-sync" -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

## API Endpoint Details

The sync endpoint is available at `/api/cron/power-automate-sync` and supports:

**Authentication Methods:**
- `Authorization: Bearer YOUR_CRON_SECRET` header
- `X-Webhook-Secret: YOUR_CRON_SECRET` header  
- `?secret=YOUR_CRON_SECRET` query parameter

**HTTP Methods:**
- `POST` (traditional)
- `GET` (for simple webhook services)

**Response:**
```json
{
  "success": true,
  "message": "Power Automate sync cron job completed",
  "summary": {
    "totalUsers": 5,
    "successfulUsers": 4,
    "failedUsers": 1,
    "totalErrors": 2
  },
  "results": [...]
}
```

## Manual Sync

You can also run the sync manually:

```bash
# Direct script execution
npx tsx scripts/power-automate-cron.ts

# Via API call
curl -X POST "https://yourdomain.com/api/cron/power-automate-sync" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Security Notes

- Always use a strong, random `CRON_SECRET`
- Consider IP whitelisting if your hosting provider supports it
- Monitor sync logs regularly for errors
- The endpoint includes rate limiting and error handling

## Troubleshooting

**Common Issues:**
1. **401 Unauthorized:** Check your `CRON_SECRET` environment variable
2. **500 Error:** Check database connection and permissions
3. **Sync failures:** Check individual user configurations and API limits

**Logs:**
- GitHub Actions: Check the "Actions" tab in your repository
- Webhook services: Usually provide execution logs
- Application logs: Check your hosting provider's logs