# Admin User Management Guide

This guide explains the enhanced user management features available in the FlowHub admin dashboard for troubleshooting user issues and managing user accounts.

## 🚀 **New Admin Features**

### **Quick Action Buttons**
Each user in the admin dashboard now has 5 action buttons for comprehensive account management:

| Button | Icon | Color | Function |
|--------|------|-------|----------|
| **Email** | ✉️ | Blue | Send individual email to user |
| **Clean Google** | 🔄 | Green | Delete Google OAuth accounts only |
| **Clear Settings** | ⚙️ | Yellow | Remove Google calendar sources |
| **Clear Sessions** | 🚪 | Orange | Force user to re-login |
| **Delete Account** | 🗑️ | Red | **Permanently delete entire account** |

### **Modal Confirmations**
Each action opens a confirmation modal with:
- ✅ Clear description of what will happen
- ✅ User details being affected
- ✅ Warning for destructive actions
- ✅ Cancel/Confirm buttons

## 🛠️ **Available Actions**

### **1. Clean Google Accounts** 🔄
**Purpose**: Resolve Google Calendar authentication issues

**What it does**:
- Deletes all Google OAuth tokens from `accounts` table
- Preserves other OAuth providers (Microsoft, etc.)
- User will need to reconnect Google Calendar

**Use cases**:
- iOS Chrome cookie issues
- Corrupted OAuth tokens
- "Token expired" errors
- User can't clear browser cache

**API**: `POST /api/admin/delete-user-accounts`
```json
{
  "userEmail": "user@example.com",
  "deleteAllAccounts": false,
  "clearUserSettings": false,
  "clearSessions": false
}
```

### **2. Clear Settings** ⚙️
**Purpose**: Remove cached calendar configuration

**What it does**:
- Removes Google calendar sources from `userSettings.calendarSources`
- Preserves other user preferences
- Forces fresh calendar source discovery

**Use cases**:
- User sees old/invalid calendars
- Calendar list not updating
- Mixed calendar data from different accounts

**API**: `POST /api/admin/delete-user-accounts`
```json
{
  "userEmail": "user@example.com",
  "deleteAllAccounts": false,
  "clearUserSettings": true,
  "clearSessions": false
}
```

### **3. Clear Sessions** 🚪
**Purpose**: Force complete re-authentication

**What it does**:
- Deletes all active sessions from `sessions` table
- User must log in again completely
- Clears all browser-stored auth state

**Use cases**:
- Authentication loops
- Multiple account confusion
- Persistent login issues
- Security concerns

**API**: `POST /api/admin/delete-user-accounts`
```json
{
  "userEmail": "user@example.com",
  "deleteAllAccounts": false,
  "clearUserSettings": false,
  "clearSessions": true
}
```

### **4. Delete Entire Account** 🗑️
**Purpose**: Completely remove user from system

**What it does**:
- **⚠️ PERMANENTLY DELETES ALL USER DATA**
- Removes records from **16 database tables**:
  - User profile and authentication
  - All tasks, notes, and calendar events
  - Journal entries and habits
  - Analytics and usage data
  - Settings and preferences

**Use cases**:
- User requests account deletion
- GDPR/privacy compliance
- Removing test accounts
- Spam/abuse cleanup

**API**: `DELETE /api/admin/delete-user`
```json
{
  "userEmail": "user@example.com"
}
```

## 🔒 **Security Features**

### **Admin-Only Access**
- Only `amascaro08@gmail.com` can access admin functions
- All actions are logged with admin email
- Admin cannot delete their own account

### **Confirmation Dialogs**
- Each action requires explicit confirmation
- Destructive actions show clear warnings
- Account deletion shows special red warning

### **Audit Trail**
- All actions logged to console with details
- User deletion provides comprehensive summary
- Track exactly what was deleted from which tables

## 📋 **Common Workflows**

### **For Google Calendar Issues**
1. **Start with Clean Google**: Try cleaning Google accounts first
2. **Add Clear Settings**: If user still sees old calendars
3. **Add Clear Sessions**: If authentication is still problematic

```bash
# Command line equivalent
npm run delete-user-accounts user@example.com --clear-settings --clear-sessions
```

### **For Complete Fresh Start**
Use all three options together:
- ✅ Clean Google accounts
- ✅ Clear settings  
- ✅ Clear sessions

This gives the user a completely fresh authentication experience.

### **For Account Removal**
Use the **Delete Account** button for permanent removal. This will:
1. Show a red warning modal
2. Delete data from all 16 tables
3. Provide deletion summary
4. Remove user from admin dashboard

## 🎯 **Database Tables Affected**

### **Clean Google Accounts**
- `accounts` (Google OAuth only)

### **Clear Settings**  
- `userSettings.calendarSources` (Google sources only)

### **Clear Sessions**
- `sessions` (all user sessions)

### **Delete Account** (ALL DATA)
1. `habitCompletions`
2. `habits` 
3. `accounts`
4. `sessions`
5. `userSettings`
6. `tasks`
7. `notes`
8. `conversations`
9. `pushSubscriptions`
10. `calendarEvents`
11. `analytics`
12. `feedback`
13. `backlog`
14. `journalActivities`
15. `journalEntries`
16. `journalMoods`
17. `journalSleep`
18. `meetings`
19. `users` (finally)

## 🔍 **Monitoring & Verification**

### **Success Indicators**
- Modal shows success message
- User count updates in admin dashboard
- Console logs show detailed operation results

### **Common Issues**
- **"User not found"**: Email address doesn't exist
- **"Unauthorized"**: Non-admin trying to access
- **"Cannot delete admin"**: Attempting self-deletion

### **Verification Steps**
1. **Check admin dashboard**: User should disappear (if deleted)
2. **Have user try logging in**: Should work after cleanup
3. **Check calendar connection**: Should work after Google cleanup
4. **Monitor logs**: Watch for successful authentication

## 🚨 **Important Warnings**

### **Account Deletion is Irreversible**
- No backup or recovery possible
- All user data permanently lost
- User must register as new account

### **Use Minimal Force**
- Start with least destructive option
- Only escalate if needed
- Account deletion should be last resort

### **Admin Responsibility**
- Double-check user email before deletion
- Confirm with user before permanent actions
- Document reason for account deletion

## 🎉 **Benefits**

✅ **One-click solutions** for common user issues  
✅ **No more manual database commands**  
✅ **Safe confirmation dialogs** prevent accidents  
✅ **Comprehensive logging** for audit trail  
✅ **Immediate feedback** on action results  
✅ **Covers all common scenarios** from cleanup to deletion

This admin interface provides a complete toolkit for managing user accounts and resolving authentication issues efficiently and safely.