# Power Automate Database Integration

This document outlines the implementation of Power Automate event persistence in the FloHub database, enabling historical event retention, delta updates, and efficient querying.

## Overview

The integration allows FloHub to store Power Automate events in the `calendar_events` table alongside local events, with proper distinction via the `source` column and additional metadata for external event tracking.

## Schema Changes

### New Columns Added

The following columns were added to the `calendar_events` table:

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | VARCHAR(255) | Unique identifier from external source |
| `user_id` | VARCHAR(255) | Alternative user identifier |
| `last_updated` | TIMESTAMP WITH TIME ZONE | When event was last updated from external source |
| `recurrence` | JSONB | Recurrence pattern data for recurring events |
| `external_id` | VARCHAR(255) | Original ID from external calendar system |
| `external_source` | VARCHAR(100) | Source system identifier (e.g., "powerautomate") |
| `sync_status` | VARCHAR(50) | Sync status (synced, pending, error, deleted) |

### Indexes Created

- `idx_calendar_events_event_id` - For efficient event ID lookups
- `idx_calendar_events_user_id` - For user-based queries
- `idx_calendar_events_external_id` - For external ID lookups
- `idx_calendar_events_external_source` - For source-based filtering
- `idx_calendar_events_sync_status` - For sync status queries
- `idx_calendar_events_last_updated` - For timestamp-based queries
- `idx_calendar_events_user_external` - Composite index for upserts
- `idx_calendar_events_unique_external` - Unique constraint to prevent duplicates

### Constraints Added

- `check_source_values` - Ensures valid source values
- `check_sync_status_values` - Ensures valid sync status values

## Implementation Components

### 1. Database Migration

**File**: `db/migrations/enhance_calendar_events_for_power_automate.sql`

This migration adds all necessary columns, indexes, and constraints to support Power Automate event storage.

### 2. Drizzle Schema Update

**File**: `db/schema.ts`

Updated the `calendarEvents` table definition to include the new columns with proper TypeScript types.

### 3. Power Automate Sync Service

**File**: `lib/powerAutomateSync.ts`

A singleton service that handles:
- Fetching events from Power Automate URLs
- Expanding recurring events into individual instances
- Upserting events into the database
- Managing sync status and error handling

### 4. API Endpoints

#### Manual Sync Endpoint
**File**: `pages/api/power-automate-sync.ts`

- `POST` - Trigger manual sync for a user
- `GET` - Get sync status for a user

#### Cron Job Endpoint
**File**: `pages/api/cron/power-automate-sync.ts`

Automated sync endpoint called by Vercel cron jobs.

### 5. Cron Job Script

**File**: `scripts/power-automate-cron.ts`

Standalone script for periodic synchronization that can be run:
- Via Vercel cron jobs (recommended)
- System cron
- GitHub Actions
- Any other cron service

## Usage

### Manual Sync

```typescript
// Trigger sync for current user
const response = await fetch('/api/power-automate-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    forceRefresh: true,
    sourceId: 'default'
  })
});

const result = await response.json();
console.log('Sync result:', result);
```

### Check Sync Status

```typescript
// Get sync status
const response = await fetch('/api/power-automate-sync?sourceId=default');
const status = await response.json();
console.log('Sync status:', status);
```

### Programmatic Usage

```typescript
import { PowerAutomateSyncService } from '@/lib/powerAutomateSync';

const syncService = PowerAutomateSyncService.getInstance();

// Sync events for a user
const result = await syncService.syncUserEvents(
  'user@example.com',
  'https://powerautomate-url.com',
  'default',
  false
);

// Get sync status
const status = await syncService.getSyncStatus('user@example.com', 'default');
```

## Database Queries

### Get Power Automate Events for User

```sql
SELECT * FROM "calendarEvents" 
WHERE "user_email" = 'user@example.com' 
  AND "external_source" = 'powerautomate'
  AND "sync_status" = 'synced'
ORDER BY "start"->>'dateTime' ASC;
```

### Get Recent Events

```sql
SELECT * FROM "calendarEvents" 
WHERE "user_email" = 'user@example.com' 
  AND "external_source" = 'powerautomate'
  AND "last_updated" > NOW() - INTERVAL '1 day'
ORDER BY "last_updated" DESC;
```

### Get Events with Errors

```sql
SELECT * FROM "calendarEvents" 
WHERE "user_email" = 'user@example.com' 
  AND "external_source" = 'powerautomate'
  AND "sync_status" = 'error';
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Required for Vercel cron jobs
CRON_SECRET=your-secret-key-here
```

### Vercel Configuration

The `vercel.json` file configures cron jobs to run every 6 hours:

```json
{
  "crons": [
    {
      "path": "/api/cron/power-automate-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Benefits

### 1. Historical Event Retention
- Events are stored permanently in the database
- Past events are available for FloCat's event-based memory
- Historical data supports insights and analytics

### 2. Reduced API Calls
- Events are cached in the database
- Only new/modified events are fetched from Power Automate
- Significantly reduces external API usage

### 3. Delta Updates
- Upsert logic prevents duplicate events
- Only changed events are updated
- Efficient synchronization process

### 4. Better Performance
- Database queries are faster than API calls
- Indexed columns enable efficient filtering
- Reduced load on Power Automate URLs

### 5. Error Handling
- Sync status tracking for failed events
- Detailed error logging and reporting
- Retry mechanisms for failed syncs

## Migration Steps

1. **Run the database migration**:
   ```bash
   # Apply the migration to your database
   # This will add all necessary columns and indexes
   ```

2. **Update your application code** to use the new schema

3. **Deploy the new API endpoints** and cron job configuration

4. **Test the integration** with a Power Automate URL

5. **Monitor the sync process** using the status endpoints

## Troubleshooting

### Common Issues

1. **Migration fails**: Ensure your database supports all the new column types
2. **Sync errors**: Check Power Automate URL accessibility and format
3. **Duplicate events**: Verify the unique constraint is working properly
4. **Performance issues**: Monitor index usage and query performance

### Debugging

- Check sync status via API endpoint
- Review database logs for constraint violations
- Monitor cron job execution logs
- Verify Power Automate URL responses

## Future Enhancements

1. **Webhook support** for real-time updates
2. **Multiple Power Automate sources** per user
3. **Advanced recurrence handling** with proper RRULE parsing
4. **Event conflict resolution** for overlapping events
5. **Bulk operations** for large event sets
6. **Analytics dashboard** for sync metrics

## Security Considerations

1. **Authentication**: All sync operations require user authentication
2. **Authorization**: Users can only sync their own events
3. **Rate limiting**: Implement rate limiting for manual sync requests
4. **Data validation**: Validate all external data before storage
5. **Error logging**: Avoid logging sensitive data in error messages