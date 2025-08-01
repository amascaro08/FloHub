# GitHub Webhook Fix Guide

## Issues Fixed

### 1. Duplicate Emails
**Problem**: Users were receiving 2 emails when their GitHub issues were closed.

**Root Cause**: Race condition where multiple webhook deliveries could pass the `notificationSent` check before the flag was updated.

**Solution**: 
- Mark `notificationSent` as `true` immediately when processing the webhook
- Check `notificationSent` flag first before any processing
- Use atomic database updates to prevent race conditions

### 2. Missing Comments
**Problem**: Closing comments were not being included in the notification emails.

**Root Cause**: The webhook was only listening to `issues` events, not `issue_comment` events.

**Solution**:
- Updated webhook to handle both `issues` and `issue_comment` event types
- Added comment capture logic for closing comments
- Enhanced email template to include closing comments when available

## Webhook Configuration

### Required GitHub Webhook Settings

1. **URL**: `https://your-domain.com/api/github-webhook`
2. **Content type**: `application/json`
3. **Secret**: Set to match your `GITHUB_WEBHOOK_SECRET` environment variable
4. **Events**: 
   - ✅ `Issues` (for issue closed events)
   - ✅ `Issue comments` (for capturing closing comments)

### Environment Variables

Ensure these are set in your deployment environment:

```bash
# GitHub Webhook Secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Email Configuration (for notifications)
EMAIL_PROVIDER=gmail  # or smtp
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Code Changes Made

### 1. Enhanced Event Handling
- Added support for both `issues` and `issue_comment` event types
- Improved event type detection using `x-github-event` header
- Better logging for debugging webhook events

### 2. Duplicate Prevention
- Check `notificationSent` flag before any processing
- Mark notification as sent immediately in database update
- Return early if notification already sent

### 3. Comment Capture
- Handle `issue_comment` events for capturing closing comments
- Pass comment body to email function when available
- Enhanced email template to display closing comments

### 4. Improved Logging
- Added detailed logging for webhook events
- Better error handling and debugging information
- Log comment details for debugging

## Testing the Fix

### 1. Test Webhook Delivery
1. Close a GitHub issue that was created from feedback
2. Check the webhook logs in your deployment platform
3. Verify only one email is sent
4. Check if closing comment is included in email

### 2. Test Comment Capture
1. Add a comment to an issue before closing it
2. Close the issue with a closing comment
3. Verify the comment appears in the notification email

### 3. Test Duplicate Prevention
1. Manually trigger the webhook multiple times
2. Verify only one email is sent
3. Check that `notificationSent` flag is properly set

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is correct
   - Verify webhook secret matches environment variable
   - Ensure webhook is enabled in GitHub repository settings

2. **Still getting duplicate emails**
   - Check database for multiple feedback entries with same issue number
   - Verify `notificationSent` flag is being set correctly
   - Check webhook delivery logs for multiple deliveries

3. **Comments not appearing in emails**
   - Verify webhook is configured for `Issue comments` events
   - Check webhook logs for comment events
   - Ensure comment is added before or during issue closure

### Debugging Steps

1. **Check Webhook Logs**
   ```bash
   # Look for webhook delivery logs in your deployment platform
   # Should see: "=== GITHUB WEBHOOK RECEIVED ==="
   ```

2. **Check Database State**
   ```sql
   -- Check if notification was sent
   SELECT id, github_issue_number, notification_sent, status 
   FROM feedback 
   WHERE github_issue_number = YOUR_ISSUE_NUMBER;
   ```

3. **Test Webhook Manually**
   ```bash
   # Use curl to test webhook endpoint
   curl -X POST https://your-domain.com/api/github-webhook \
     -H "Content-Type: application/json" \
     -H "X-GitHub-Event: issues" \
     -d '{"action":"closed","issue":{"number":123,"title":"Test","state":"closed"}}'
   ```

## Migration Notes

### For Existing Feedback
- Existing feedback entries will work with the new webhook logic
- The `notificationSent` flag prevents duplicate emails for already processed feedback
- No database migration required

### For New Feedback
- New feedback will automatically use the improved webhook handling
- Comments will be captured if webhook is properly configured
- Duplicate prevention is built-in

## Best Practices

1. **Webhook Security**
   - Always use webhook secrets
   - Verify webhook signatures
   - Monitor webhook delivery logs

2. **Email Notifications**
   - Test email configuration regularly
   - Monitor email delivery rates
   - Handle email failures gracefully

3. **Database Consistency**
   - Use atomic updates to prevent race conditions
   - Add proper indexes for performance
   - Monitor database connection health

## Future Enhancements

1. **Comment Storage**
   - Store closing comments in database
   - Add comment history to feedback dashboard
   - Enable comment search and filtering

2. **Enhanced Notifications**
   - Add notification preferences
   - Support different notification channels
   - Add notification templates

3. **Webhook Analytics**
   - Track webhook delivery success rates
   - Monitor webhook performance
   - Add webhook health checks