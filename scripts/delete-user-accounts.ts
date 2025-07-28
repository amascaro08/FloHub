import { db } from '../lib/drizzle';
import { accounts, users, sessions, userSettings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Script to delete a user's saved Google accounts and related authentication data
 * This will force the user to re-authenticate with Google Calendar
 */

interface DeleteUserAccountsOptions {
  userEmail: string;
  deleteAllAccounts?: boolean; // If true, deletes all OAuth accounts, not just Google
  clearUserSettings?: boolean; // If true, also clears calendar sources from user settings
  clearSessions?: boolean; // If true, also clears all user sessions
}

async function deleteUserAccounts(options: DeleteUserAccountsOptions) {
  const { 
    userEmail, 
    deleteAllAccounts = false, 
    clearUserSettings = false, 
    clearSessions = false 
  } = options;

  console.log(`🔍 Looking for user with email: ${userEmail}`);
  
  try {
    // First, find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      console.error(`❌ User not found with email: ${userEmail}`);
      return { success: false, error: 'User not found' };
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);

    // Find all accounts for this user
    const userAccounts = await db.query.accounts.findMany({
      where: eq(accounts.userId, user.id),
    });

    console.log(`📋 Found ${userAccounts.length} account(s) for user`);
    userAccounts.forEach(account => {
      console.log(`  - ${account.provider} (ID: ${account.id})`);
    });

    // Delete accounts based on options
    let deletedAccountsCount = 0;
    
    if (deleteAllAccounts) {
      // Delete all OAuth accounts
      const result = await db.delete(accounts)
        .where(eq(accounts.userId, user.id));
      deletedAccountsCount = userAccounts.length;
      console.log(`🗑️ Deleted all ${deletedAccountsCount} account(s)`);
    } else {
      // Delete only Google accounts
      const googleAccounts = userAccounts.filter(account => account.provider === 'google');
      if (googleAccounts.length > 0) {
        await db.delete(accounts)
          .where(and(
            eq(accounts.userId, user.id),
            eq(accounts.provider, 'google')
          ));
        deletedAccountsCount = googleAccounts.length;
        console.log(`🗑️ Deleted ${deletedAccountsCount} Google account(s)`);
      } else {
        console.log(`ℹ️ No Google accounts found for user`);
      }
    }

    // Clear user sessions if requested
    if (clearSessions) {
      const userSessions = await db.query.sessions.findMany({
        where: eq(sessions.userId, user.id),
      });
      
      if (userSessions.length > 0) {
        await db.delete(sessions)
          .where(eq(sessions.userId, user.id));
        console.log(`🗑️ Deleted ${userSessions.length} session(s)`);
      } else {
        console.log(`ℹ️ No sessions found for user`);
      }
    }

    // Clear calendar sources from user settings if requested
    if (clearUserSettings) {
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, userEmail),
      });

      if (settings) {
        const currentSources = settings.calendarSources as any[] || [];
        const nonGoogleSources = currentSources.filter((source: any) => source.type !== 'google');
        
        await db.update(userSettings)
          .set({
            calendarSources: nonGoogleSources,
          })
          .where(eq(userSettings.user_email, userEmail));
        
        const removedGoogleSources = currentSources.length - nonGoogleSources.length;
        console.log(`🗑️ Removed ${removedGoogleSources} Google calendar source(s) from user settings`);
      } else {
        console.log(`ℹ️ No user settings found for user`);
      }
    }

    console.log(`✅ Successfully cleaned up accounts for user: ${userEmail}`);
    return { 
      success: true, 
      deletedAccountsCount,
      message: `Deleted ${deletedAccountsCount} account(s). User can now re-authenticate fresh.`
    };

  } catch (error) {
    console.error('❌ Error deleting user accounts:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: npm run delete-user-accounts <user-email> [options]

Options:
  --all-accounts    Delete all OAuth accounts (not just Google)
  --clear-settings  Clear Google calendar sources from user settings
  --clear-sessions  Clear all user sessions (forces re-login)

Examples:
  npm run delete-user-accounts user@example.com
  npm run delete-user-accounts user@example.com --clear-settings --clear-sessions
  npm run delete-user-accounts user@example.com --all-accounts --clear-settings --clear-sessions
    `);
    process.exit(1);
  }

  const userEmail = args[0];
  const options: DeleteUserAccountsOptions = {
    userEmail,
    deleteAllAccounts: args.includes('--all-accounts'),
    clearUserSettings: args.includes('--clear-settings'),
    clearSessions: args.includes('--clear-sessions'),
  };

  console.log('🚀 Starting user account cleanup...');
  console.log('Options:', {
    userEmail: options.userEmail,
    deleteAllAccounts: options.deleteAllAccounts,
    clearUserSettings: options.clearUserSettings,
    clearSessions: options.clearSessions,
  });

  const result = await deleteUserAccounts(options);
  
  if (result.success) {
    console.log(`🎉 ${result.message}`);
    process.exit(0);
  } else {
    console.error(`💥 Failed: ${result.error}`);
    process.exit(1);
  }
}

// Export for use as a module
export { deleteUserAccounts };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}