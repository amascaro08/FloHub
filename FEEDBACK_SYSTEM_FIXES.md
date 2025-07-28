# Feedback System Fixes

## Issues Identified

### 1. Database Schema Mismatch
- **Problem**: The database schema in code didn't match the actual production database
- **Error**: `Failed query: select "id", "userId", "feedbackType", "feedbackText"...` 
- **Root Cause**: Code expected `userId`, `feedbackType`, `feedbackText` but database has `user_id`, `title`, `description`

### 2. GitHub Webhook Redirect Issue
- **Problem**: GitHub webhook returning redirect response instead of 200 OK
- **Error**: `Body: Redirecting...`
- **Root Cause**: Missing CORS headers and insufficient logging

### 3. API Endpoint Failures
- **Problem**: Both `/api/github-issues` and `/api/feedback` returning 500 errors
- **Root Cause**: Database column name mismatches causing SQL query failures

## Fixes Applied

### 1. Updated Database Schema (`db/schema.ts`)
```typescript
export const feedback = pgTable("feedback", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(), // Maps to actual DB column
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  githubIssueNumber: integer("github_issue_number"),
  githubIssueUrl: text("github_issue_url"),
  completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow(),
});
```

### 2. Fixed API Endpoints

#### `/pages/api/github-issues.ts`
- Updated to use `title` and `description` instead of `feedbackType` and `feedbackText`
- Fixed user identification to use email addresses
- Proper error handling for GitHub API calls

#### `/pages/api/feedback.ts`
- Updated column mappings to match database structure
- Added backward compatibility mapping for frontend
- Fixed user email handling

#### `/pages/api/github-webhook.ts`
- Added proper CORS headers to prevent redirects
- Enhanced logging for debugging
- Better error handling and signature verification

### 3. User Identification Fix
The system uses email addresses as user identifiers throughout, but the feedback table expects this in the `user_id` field. Fixed APIs to:
- Use `user.email` for `userId` field
- Maintain consistency with other tables like `tasks`, `notes`, etc.

## Environment Variables Required

Ensure these are set in Vercel:

```bash
# GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO_OWNER=your_github_username
GITHUB_REPO_NAME=your_repo_name
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Database
NEON_DATABASE_URL=your_neon_database_url

# Optional for debugging
DEBUG_SECRET=your_debug_secret
```

## Webhook Configuration

Update GitHub webhook URL to:
- **URL**: `https://flohub.vercel.app/api/github-webhook`
- **Content type**: `application/json`
- **Events**: `Issues` (specifically issue closed events)
- **Secret**: Set to match `GITHUB_WEBHOOK_SECRET` env var

## Testing

### 1. Test Feedback Submission
```bash
curl -X POST https://flohub.vercel.app/api/github-issues \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=your_auth_token" \
  -d '{"feedbackType":"bug","feedbackText":"Test feedback"}'
```

### 2. Test Feedback Retrieval
```bash
curl https://flohub.vercel.app/api/feedback \
  -H "Cookie: auth-token=your_auth_token"
```

### 3. Debug Database Schema
```bash
curl "https://flohub.vercel.app/api/debug-feedback-schema?debug=your_debug_secret"
```

## Deployment Steps

1. **Deploy the code changes**:
   ```bash
   git add .
   git commit -m "Fix feedback system database schema and API endpoints"
   git push origin main
   ```

2. **Verify environment variables** in Vercel dashboard

3. **Test the webhook** using GitHub's webhook test feature

4. **Monitor logs** in Vercel dashboard for any remaining issues

## Database Migration Notes

The current fix assumes the database structure you provided is correct:
- `user_id` as UUID/VARCHAR (storing email addresses)
- `title` and `description` instead of `feedbackType` and `feedbackText`
- All GitHub-related columns already exist

If the database doesn't have the GitHub columns, run:
```sql
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## Monitoring

After deployment, monitor:
1. Vercel function logs for API errors
2. GitHub webhook delivery logs
3. User feedback submission success rates
4. Email notification delivery

## Cleanup

After confirming everything works, delete the debug endpoint:
```bash
rm pages/api/debug-feedback-schema.ts
```