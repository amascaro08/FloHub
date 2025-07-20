# GitHub Feedback Integration

This document explains how to set up and use the GitHub feedback integration feature that automatically creates GitHub issues from user feedback.

## Overview

The feedback system now creates GitHub issues directly instead of storing feedback in the app's database. This allows for better tracking, prioritization, and management of user feedback using GitHub's powerful issue management features.

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to GitHub.com and sign in to your account
2. Navigate to **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
3. Click **Generate new token** > **Generate new token (classic)**
4. Give your token a descriptive name (e.g., "FlowPilot Feedback Integration")
5. Set an appropriate expiration date
6. Select the following scopes:
   - `repo` (Full control of private repositories) - **Required**
   - `public_repo` (Access public repositories) - **Required if using public repo**

### 2. Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_REPO_OWNER=your_github_username_or_organization
GITHUB_REPO_NAME=your_repository_name
```

**Example:**
```env
GITHUB_TOKEN=ghp_1234567890abcdefghijk...
GITHUB_REPO_OWNER=yourusername
GITHUB_REPO_NAME=your-app-repo
```

### 3. Repository Setup

1. Ensure your repository exists and you have admin/write access
2. Optionally, create labels for better organization:
   - `feedback` (for all feedback issues)
   - `bug` (for bug reports)
   - `enhancement` (for feature requests)
   - `ui/ux` (for UI-related feedback)
   - `calendar` (for calendar-specific issues)
   - `performance` (for performance issues)

## How It Works

### User Experience

1. **Feedback Submission**: Users access the feedback page at `/feedback`
2. **Type Selection**: Users choose from predefined feedback types:
   - 🐛 Bug Report
   - ✨ Feature Request
   - 🎨 UI/UX Issue
   - 📅 Calendar Issue
   - ⚡ Performance Issue
   - 💬 General Feedback

3. **Tag Selection**: Users can add relevant tags from predefined options or create custom tags
4. **Submission**: Upon submission, a GitHub issue is automatically created
5. **Tracking**: Users receive a direct link to the GitHub issue for tracking progress

### GitHub Issue Format

Each feedback submission creates a GitHub issue with:

- **Title**: Formatted with emoji and type prefix
- **Body**: Contains user details, feedback description, and tags
- **Labels**: Automatically assigned based on feedback type and user tags
- **Metadata**: Includes submission date and user email

### Example Issue

```
Title: 🐛 Bug Report: Calendar events not syncing properly...

## Feedback Details

**Type:** bug
**Submitted by:** user@example.com
**Date:** 2024-01-15T10:30:00.000Z

## Description

Calendar events are not syncing properly with Google Calendar. When I create an event in the app, it doesn't appear in my Google Calendar for several hours.

## Tags

- urgent
- calendar
- google-integration

---
*This issue was automatically created from user feedback.*
```

## Benefits

### For Users
- **Transparency**: Direct visibility into issue status and progress
- **GitHub Integration**: Can follow, comment, and receive notifications
- **Better Tracking**: Professional issue tracking with GitHub's tools

### For Developers
- **Centralized Management**: All feedback in one place with your code
- **Prioritization**: Use GitHub's project boards, milestones, and labels
- **Integration**: Link issues to pull requests and commits
- **Automation**: Use GitHub Actions for automated workflows

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if your GitHub token is valid and has correct permissions
   - Ensure the token has `repo` scope

2. **404 Not Found**
   - Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are correct
   - Ensure the repository exists and you have access

3. **403 Forbidden**
   - Check if you have write access to the repository
   - Verify token permissions and expiration

### Error Messages

The system provides user-friendly error messages while logging detailed errors for debugging:

- **User sees**: "GitHub integration not configured. Please contact admin."
- **Logs show**: Specific API error details for troubleshooting

## Security Considerations

1. **Token Security**: Keep your GitHub token secure and never commit it to version control
2. **Repository Access**: Only grant necessary permissions to the repository
3. **User Privacy**: User email addresses are included in issues - ensure this complies with your privacy policy
4. **Rate Limiting**: GitHub API has rate limits - monitor usage if you have high feedback volume

## Maintenance

### Regular Tasks
1. **Monitor Token Expiration**: Set calendar reminders to renew tokens before expiration
2. **Review Labels**: Periodically review and organize issue labels
3. **Archive Resolved Issues**: Use GitHub's features to organize completed feedback

### Scaling Considerations
- For high-volume feedback, consider implementing rate limiting
- Use GitHub's API webhooks for real-time status updates
- Consider implementing issue templates for consistent formatting

## Advanced Configuration

### Custom Labels
You can modify the label assignment logic in `pages/api/github-issues.ts` to match your team's workflow.

### Issue Templates
Create GitHub issue templates in your repository to standardize feedback format.

### Automation
Use GitHub Actions to:
- Auto-assign issues to team members
- Add issues to project boards
- Send notifications to Slack/Discord
- Update issue status based on code changes