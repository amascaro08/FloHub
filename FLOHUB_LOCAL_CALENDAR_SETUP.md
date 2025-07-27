# FloHub Local Calendar Feature

## Overview

The FloHub Local Calendar is a new feature that provides a local calendar option for users who:
- Don't want to connect external calendar services
- Want to store events locally within FloHub
- Need a calendar that's always available regardless of external service connectivity

## Key Features

✅ **Always Available**: Local calendar works without any external connections
✅ **Full Event Management**: Create, edit, and delete events
✅ **Integration**: Seamlessly integrates with existing calendar view and widget
✅ **Backward Compatible**: All existing functionality (Google, O365, iCal) remains intact
✅ **No Setup Required**: Available immediately for all users

## Setup Instructions

### 1. Database Migration

Run the database migration to update the calendar events table:

```bash
# Option 1: Using the provided script (recommended)
cd scripts
node run_calendar_migration.js

# Option 2: Manual SQL execution
psql "$DATABASE_URL" -f scripts/migrate_calendar_events.sql
```

### 2. Verify Installation

1. Log into FloHub
2. Navigate to the Calendar page
3. Click "Add Event"
4. You should see "🏠 FloHub Local" as the first option in the calendar dropdown

## Technical Implementation

### Database Schema

The `calendarEvents` table has been enhanced with the following columns:

```sql
- user_email: varchar(255) NOT NULL
- summary: text NOT NULL
- description: text
- location: text
- start: jsonb NOT NULL
- end: jsonb
- calendar_id: varchar(255) DEFAULT 'flohub_local'
- source: varchar(50) DEFAULT 'personal'
- tags: text[]
- is_recurring: boolean DEFAULT false
- series_master_id: text
- instance_index: integer
- created_at: timestamp DEFAULT now()
- updated_at: timestamp DEFAULT now()
```

### API Endpoints

#### Local Calendar API (`/api/calendar/local`)

- **GET**: Fetch local calendar events for a user
- **POST**: Create new local calendar event
- **PUT**: Update existing local calendar event
- **DELETE**: Delete local calendar event

#### Integration with Main Calendar API (`/api/calendar`)

The main calendar API now automatically fetches and includes local events alongside external calendar sources.

### Frontend Components

#### CalendarEventForm
- Updated to always show "FloHub Local" as an option
- Defaults to local calendar when no external calendars are connected
- Maintains full compatibility with existing calendar sources

#### Calendar Page
- Fixed loading issue when no external sources are connected
- Always enabled when user is authenticated (includes local events)
- Seamlessly displays local and external events together

#### Calendar Widget
- Automatically displays local events alongside external events
- No changes required - works out of the box

## Usage Guide

### Creating Local Events

1. Go to Calendar page
2. Click "Add Event"
3. Select "🏠 FloHub Local" from the calendar dropdown
4. Fill in event details
5. Click "Create Event"

### Viewing Local Events

Local events appear in:
- Calendar page (month/week/day views)
- Calendar widget on dashboard
- Event search and filtering

### Managing Local Events

- **Edit**: Click on any local event to edit details
- **Delete**: Use the delete button in the event detail modal
- **Tags**: Add custom tags for organization
- **Event Types**: Mark as personal or work events

## Benefits

### For Users
- **No External Dependencies**: Works without Google/O365 connections
- **Privacy**: Events stored locally in FloHub database
- **Always Available**: Never affected by external service outages
- **Simple Setup**: No OAuth or API key configuration needed

### For Administrators
- **Reduced Support**: Fewer issues related to external calendar connections
- **Better Reliability**: Core calendar functionality always works
- **Data Control**: All calendar data under your control

## Backward Compatibility

### Existing Features Preserved
- ✅ Google Calendar integration
- ✅ O365/PowerAutomate integration
- ✅ iCal feed integration
- ✅ All existing event management features
- ✅ Calendar sources configuration
- ✅ Calendar widget functionality

### Migration Safety
- Existing calendar events are preserved
- No breaking changes to existing APIs
- Gradual rollout possible (users can opt-in)

## Troubleshooting

### Migration Issues

If the database migration fails:

1. Check database connectivity
2. Ensure DATABASE_URL environment variable is set
3. Verify database permissions
4. Run migration manually using psql

### Calendar Not Showing

If FloHub Local doesn't appear:

1. Clear browser cache
2. Check browser console for errors
3. Verify user is logged in
4. Check database migration was successful

### Events Not Displaying

If local events don't appear:

1. Check browser network tab for API errors
2. Verify events were created successfully
3. Check date range filters
4. Ensure no JavaScript errors in console

## API Documentation

### Local Calendar Events

#### GET /api/calendar/local
```
Query Parameters:
- timeMin: ISO date string (start of range)
- timeMax: ISO date string (end of range)

Response:
{
  "events": [
    {
      "id": "flohub_local_...",
      "summary": "Event Title",
      "start": { "dateTime": "2024-01-01T10:00:00Z" },
      "end": { "dateTime": "2024-01-01T11:00:00Z" },
      "calendarId": "flohub_local",
      "source": "personal",
      "calendarName": "FloHub Local"
    }
  ]
}
```

#### POST /api/calendar/local
```
Request Body:
{
  "summary": "Event Title",
  "description": "Event description",
  "start": "2024-01-01T10:00",
  "end": "2024-01-01T11:00",
  "source": "personal",
  "tags": ["meeting", "important"]
}
```

## Future Enhancements

### Planned Features
- 🔄 Recurring event support
- 📱 Calendar sync with mobile apps
- 🎨 Custom calendar colors
- 📋 Bulk event operations
- 📊 Calendar analytics and insights

### Integration Opportunities
- 📧 Email notifications for local events
- 🔔 Browser push notifications
- 📅 Export to external calendar formats
- 🤖 AI-powered event suggestions

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check database logs for migration issues
4. Contact FloHub support with specific error messages