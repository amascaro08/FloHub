# iCal Integration for FloHub

This document describes the new iCal calendar integration feature that allows users to subscribe to any public iCal (.ics) calendar feed.

## Features

- **Read-only calendar feeds**: Subscribe to any public iCal/ICS URL
- **WebCal support**: Automatically converts webcal:// URLs to https://
- **Real-time testing**: Test calendar feeds before adding them
- **Event synchronization**: Events from iCal feeds appear alongside Google Calendar and PowerAutomate events
- **Tag support**: Assign custom tags to iCal calendars
- **Source classification**: Events can be tagged as "work" or "personal"

## How to Add an iCal Calendar

1. Go to **Settings** → **Calendar Sources**
2. Click the **"Add iCal Calendar"** button
3. Enter a name for your calendar (e.g., "Team Events", "Holiday Calendar")
4. Enter the iCal URL (supports multiple formats):
   - `https://calendar.google.com/calendar/ical/.../basic.ics`
   - `webcal://outlook.live.com/calendar/.../calendar.ics`
   - `https://your-server.com/calendar.ics`
5. Click **"Test URL"** to verify the feed works
6. Configure tags and enable/disable as needed

## Supported URL Formats

- **HTTPS URLs**: `https://example.com/calendar.ics`
- **HTTP URLs**: `http://example.com/calendar.ics`
- **WebCal URLs**: `webcal://example.com/calendar.ics` (automatically converted to HTTPS)

## Examples of Common iCal Sources

### Google Calendar Public Feeds
1. Go to Google Calendar settings
2. Find the calendar you want to share
3. Get the public iCal URL (usually ends with `/basic.ics`)

### Outlook/Office 365 Shared Calendars
1. Go to Outlook calendar
2. Right-click on the calendar to share
3. Copy the ICS link

### Third-party Calendar Services
- **Apple Calendar**: Can publish calendars with iCal feeds
- **Calendly**: Provides iCal feeds for bookings
- **Facebook Events**: Some event pages provide iCal feeds
- **University/School calendars**: Often provide academic calendar feeds
- **Sports teams**: Many teams provide game schedule feeds

## Limitations

- **Read-only**: You cannot create, edit, or delete events in iCal calendars
- **Refresh rate**: iCal feeds are fetched in real-time when you view your calendar
- **Public feeds only**: The feeds must be publicly accessible (no authentication)
- **Time zones**: Events inherit the timezone from the iCal feed

## Troubleshooting

### "URL not found or unreachable"
- Verify the URL is correct and publicly accessible
- Check if the server requires specific headers or user agents
- Try accessing the URL directly in your browser

### "Failed to parse iCal feed"
- Ensure the URL returns valid iCal data (content should start with `BEGIN:VCALENDAR`)
- Check if the feed requires authentication (not supported)
- Verify the feed follows standard iCal format

### "Request timed out"
- The server may be slow or temporarily unavailable
- Try again later or contact the calendar provider

### Events not showing
- Check that the calendar source is enabled in settings
- Verify that events fall within your selected date range
- Ensure the iCal feed contains events (some feeds may be empty)

## Technical Details

- **Library**: Uses `node-ical` for parsing iCal feeds
- **Caching**: No caching implemented (feeds fetched on each request)
- **Timeout**: 30-second timeout for iCal feed requests
- **Format support**: Supports standard RFC 5545 iCal format
- **Recurring events**: Basic support for recurring events via RRule

## Security Notes

- iCal URLs are stored securely in the user's settings
- All requests include a user agent: "FloHub Calendar Integration/1.0"
- No authentication credentials are stored or transmitted
- Only public, unauthenticated feeds are supported for security

## Future Enhancements

Potential future improvements could include:
- Caching of iCal feeds to improve performance
- Authentication support for private feeds
- Automatic refresh scheduling
- Advanced filtering and transformation options
- Import/export of calendar configurations