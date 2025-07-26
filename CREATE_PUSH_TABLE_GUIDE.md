# Create pushSubscriptions Table - Step-by-Step Guide

## Problem
You're seeing the error: "pushSubscriptions table needs to be created"

This means the database table for storing notification subscriptions doesn't exist yet.

## Solutions (Choose One)

### 🚀 Option 1: Automatic Script (Recommended)

**If you have database URL in .env.local:**
```bash
npm run notifications:create-table
```

**If database URL is only in Vercel:**
- Run this command in Vercel's function environment, or
- Temporarily add your database URL to .env.local for this setup

### 🔧 Option 2: Manual SQL (Reliable)

1. **Go to your Neon Dashboard**
   - Log into [console.neon.tech](https://console.neon.tech)
   - Select your project/database

2. **Open SQL Editor**
   - Click on "SQL Editor" in the sidebar

3. **Run this SQL:**
```sql
-- Create pushSubscriptions table for FlowHub notifications
CREATE TABLE IF NOT EXISTS "pushSubscriptions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_email" varchar(255) NOT NULL,
    "subscription" jsonb NOT NULL
);

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS "idx_pushSubscriptions_user_email" ON "pushSubscriptions" ("user_email");

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pushSubscriptions'
ORDER BY ordinal_position;
```

4. **Click "Run" to execute**

### 🛠 Option 3: Database Migrations

**If you want to run full migrations:**
1. Add your database URL to `.env.local` temporarily:
```bash
NEON_DATABASE_URL=your-actual-database-url-here
```

2. Run migrations:
```bash
npm run db:push
```

3. Remove the database URL from `.env.local` (since it's in Vercel)

## Verification

After creating the table, verify it works:

1. **Check the table exists:**
```bash
npm run notifications:check-db
```

2. **Test notifications:**
   - Go to Settings > Notifications in your app
   - Click "Enable" 
   - Click "Send Test Notification"

## Expected Table Structure

The `pushSubscriptions` table should have:
- `id` (text, primary key) - Unique identifier for the subscription
- `user_email` (varchar 255, not null) - User's email address
- `subscription` (jsonb, not null) - Browser push subscription data

## Troubleshooting

### **Error: "permission denied"**
- Make sure you're using an admin/owner account in Neon
- Check that your database user has CREATE TABLE permissions

### **Error: "relation already exists"**
- The table already exists! This is good
- Run the verification steps to confirm it's working

### **Error: "database connection failed"**
- Check your database URL is correct
- Verify your database is running
- Ensure your IP is allowlisted (if applicable)

### **Script fails with "Database URL not configured"**
- For local development: Add URL to `.env.local`
- For production: URL should be in Vercel environment variables
- Alternative: Use the manual SQL method

## Quick Commands Reference

```bash
# Create the table automatically
npm run notifications:create-table

# Check if table exists and is working
npm run notifications:check-db

# Complete notification setup verification
npm run notifications:setup

# Generate VAPID keys if needed
npm run notifications:generate-keys
```

## After Table Creation

Once the table is created:

1. ✅ **Notifications will work** in production (Vercel)
2. ✅ **Test notifications** will work if you have database URL locally
3. ✅ **Subscription storage** will persist user notification preferences
4. ✅ **Scheduled notifications** will work (meetings, tasks, FloChat reminders)

## Production Note

In production (Vercel), this table creation is typically done once during initial deployment. The database URL is already configured in Vercel environment variables, so all notification features work automatically once the table exists.

---

## Need Help?

If you encounter issues:
1. Check the table exists: `npm run notifications:check-db`
2. Try manual SQL creation in Neon dashboard
3. Verify your database permissions
4. Test with a simple `SELECT 1` query in Neon console first