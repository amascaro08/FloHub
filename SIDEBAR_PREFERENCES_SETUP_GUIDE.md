# Sidebar Preferences Setup Guide

## 🔍 Issue Diagnosis

The 500 errors you're seeing are because the `sidebar_preferences` column doesn't exist in your database yet. The API is trying to query a column that hasn't been created.

## 🛠️ Solution

You need to run a database migration to add the `sidebar_preferences` column to your `user_settings` table.

## 📋 Step-by-Step Fix

### Option 1: Use Neon Dashboard (Recommended)

1. **Log into your Neon dashboard**
2. **Navigate to your FloHub database**
3. **Open the SQL Editor**
4. **Run this SQL command:**

```sql
-- Add sidebar_preferences column to user_settings table
ALTER TABLE user_settings
ADD COLUMN sidebar_preferences JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN user_settings.sidebar_preferences IS 'Stores user sidebar customization settings including visiblePages and order arrays';

-- Optional: Set default preferences for existing users
UPDATE user_settings 
SET sidebar_preferences = '{
  "visiblePages": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  "order": ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  "collapsed": false
}'::jsonb
WHERE sidebar_preferences = '{}' OR sidebar_preferences IS NULL;
```

### Option 2: Use psql Command Line

If you have psql installed locally:

```bash
# Copy the SQL from add_sidebar_preferences_to_user_settings.sql
psql $DATABASE_URL -f add_sidebar_preferences_to_user_settings.sql
```

### Option 3: Use Another Database Client

If you use TablePlus, DBeaver, or another database client:

1. Connect to your Neon PostgreSQL database
2. Run the SQL commands from Option 1 above

## ✅ Verification

After running the migration, you can verify it worked by:

1. **Check the column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'sidebar_preferences';
```

2. **Test the API:**
   - Go to your FloHub settings page
   - Navigate to the Sidebar tab
   - Try toggling visibility or reordering items
   - Check browser console for errors (should be gone)

## 📊 Expected Results

After the migration:
- ✅ No more 500 errors in browser console
- ✅ Sidebar customization changes take effect immediately
- ✅ Settings persist across page reloads
- ✅ Settings sync across devices

## 🔧 Database Schema Context

The `user_settings` table is the correct location because:
- FloHub already uses this table for all user preferences
- It has `user_email` as the primary key
- Other settings like `timezone`, `layouts`, `calendar_settings` are stored here
- This maintains consistency with the existing architecture

## 🎯 Why This Column Is Needed

The new sidebar customization features require storing:
```json
{
  "visiblePages": ["Hub", "Tasks", "Notes", "Calendar"],
  "order": ["Hub", "Notes", "Tasks", "Calendar"],
  "collapsed": false
}
```

This data structure allows users to:
- Hide/show navigation items
- Reorder menu items
- Remember sidebar collapse state
- Sync preferences across devices

## 🚨 Important Notes

1. **Backup First**: Always backup your database before running migrations in production
2. **Test Environment**: If you have a staging environment, test there first
3. **Zero Downtime**: This migration adds a new column with a default value, so it's safe to run on live systems
4. **Permissions**: Ensure your database user has ALTER TABLE permissions

## 💡 Troubleshooting

If you still see errors after the migration:

1. **Clear browser cache** and hard refresh (Ctrl+F5)
2. **Check the migration worked:**
   ```sql
   \d user_settings
   ```
3. **Verify data:**
   ```sql
   SELECT user_email, sidebar_preferences 
   FROM user_settings 
   LIMIT 5;
   ```

## 📞 Support

If you continue having issues:
1. Check the browser console for specific error messages
2. Check your database logs for any constraint violations
3. Ensure your `DATABASE_URL` environment variable is correct
4. Verify your database user has the necessary permissions

---

**After running the migration, your sidebar customization should work perfectly! 🎉**