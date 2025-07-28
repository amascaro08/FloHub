# User Account Cleanup Guide

This guide explains how to delete a user's saved Google accounts from the database to resolve authentication issues, especially when users are experiencing problems with Google Calendar integration due to cookie issues or testing with initial builds.

## Problem Description

Users may experience issues with Google Calendar authentication due to:
- **Cookie problems**: iOS Chrome users can't clear individual site data
- **Corrupted OAuth tokens**: From testing with initial builds
- **Cached authentication state**: Old or invalid tokens causing connection failures
- **Multiple account conflicts**: User has multiple Google accounts causing confusion

## Solution Overview

The system stores Google OAuth data in several places:
1. **`accounts` table**: Contains OAuth tokens and provider information
2. **`userSettings` table**: Contains calendar sources and configuration
3. **`sessions` table**: Contains user session data

## Available Tools

### 1. Command Line Script

The most comprehensive way to clean up user accounts:

```bash
# Delete only Google accounts (recommended for Google auth issues)
npm run delete-user-accounts user@example.com

# Delete Google accounts and clear calendar settings
npm run delete-user-accounts user@example.com --clear-settings

# Delete Google accounts, clear settings, and force re-login
npm run delete-user-accounts user@example.com --clear-settings --clear-sessions

# Delete ALL OAuth accounts (use with caution)
npm run delete-user-accounts user@example.com --all-accounts --clear-settings --clear-sessions
```

**Options:**
- `--all-accounts`: Delete all OAuth accounts (Google, Microsoft, etc.)
- `--clear-settings`: Remove Google calendar sources from user settings
- `--clear-sessions`: Clear all user sessions (forces re-login)

### 2. API Endpoint

For programmatic access or integration with admin dashboards:

```javascript
// POST /api/admin/delete-user-accounts
{
  "userEmail": "user@example.com",
  "deleteAllAccounts": false,
  "clearUserSettings": true,
  "clearSessions": true
}
```

## Database Tables Affected

### `accounts` Table
```sql
-- Contains OAuth provider information
SELECT * FROM accounts WHERE "userId" = (
  SELECT id FROM users WHERE email = 'user@example.com'
);

-- Manual deletion (if needed)
DELETE FROM accounts 
WHERE "userId" = (SELECT id FROM users WHERE email = 'user@example.com')
AND provider = 'google';
```

### `userSettings` Table
```sql
-- Contains calendar sources
SELECT calendar_sources FROM user_settings WHERE user_email = 'user@example.com';

-- Manual cleanup (if needed)
UPDATE user_settings 
SET calendar_sources = '[]'::jsonb 
WHERE user_email = 'user@example.com';
```

### `sessions` Table
```sql
-- Contains active sessions
SELECT * FROM sessions WHERE "userId" = (
  SELECT id FROM users WHERE email = 'user@example.com'
);

-- Manual deletion (if needed)
DELETE FROM sessions 
WHERE "userId" = (SELECT id FROM users WHERE email = 'user@example.com');
```

## Step-by-Step Resolution Process

### For Google Calendar Authentication Issues:

1. **Identify the user's email address**
2. **Use the cleanup script**:
   ```bash
   npm run delete-user-accounts user@example.com --clear-settings --clear-sessions
   ```
3. **Verify cleanup** (optional):
   ```sql
   -- Check that Google accounts are deleted
   SELECT * FROM accounts WHERE "userId" = (
     SELECT id FROM users WHERE email = 'user@example.com'
   ) AND provider = 'google';
   
   -- Should return no rows
   ```
4. **Have user try connecting Google Calendar again**
5. **Monitor the process** by checking logs at `/api/auth/callback/google-additional`

### For iOS Chrome Cookie Issues Specifically:

Since iOS Chrome users can't clear individual site data:

1. **Delete the user's Google accounts**:
   ```bash
   npm run delete-user-accounts user@example.com --clear-settings --clear-sessions
   ```
2. **Have user clear ALL browser data** (Settings > Privacy & Security > Clear Browsing Data)
3. **Have user restart the browser completely**
4. **Have user try connecting Google Calendar again**

## Verification Steps

After cleanup, verify the user can:
1. **Log in successfully** (if sessions were cleared)
2. **Navigate to Settings > Calendar**
3. **Click "Connect Google Calendar"**
4. **Complete OAuth flow without errors**
5. **See their Google calendars appear in the list**

## Common Issues and Solutions

### "OAuth configuration missing" error
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in environment variables
- Verify `NEXTAUTH_URL` is correctly configured

### "Token expired" errors
- Run the cleanup script with `--clear-settings` to force fresh token retrieval

### User sees old calendar data
- Run cleanup with `--clear-settings` to remove cached calendar sources

### Multiple Google accounts causing confusion
- Use `--clear-sessions` to force complete re-authentication

## Database Schema Reference

The relevant tables and their relationships:

```
users (id, email, name, ...)
  ↓ (1:many)
accounts (id, userId, provider, access_token, refresh_token, ...)
  ↓ (cascade delete)
sessions (id, userId, sessionToken, ...)

user_settings (user_email, calendar_sources, ...)
```

## Environment Variables Required

For Google OAuth to work properly:
- `GOOGLE_CLIENT_ID` or `GOOGLE_OAUTH_ID`
- `GOOGLE_CLIENT_SECRET` or `GOOGLE_OAUTH_SECRET`
- `NEXTAUTH_URL` (must match OAuth redirect URI)

## Security Notes

- The API endpoint only allows users to delete their own accounts
- Admin access would need to be implemented for cross-user account management
- All deletions are logged with detailed information
- Database foreign key constraints ensure data integrity

## Monitoring and Debugging

Check these logs when troubleshooting:
- `/api/auth/callback/google-additional` - OAuth callback processing
- `/api/calendar` - Calendar data fetching
- `/api/userSettings` - Settings updates

The cleanup script provides detailed logging of all operations performed.