#!/usr/bin/env tsx

/**
 * Power Automate Sync Job
 * 
 * This script syncs Power Automate events for all users. It can be triggered by:
 * 
 * - Intelligent background sync (recommended - no external setup required)
 * - Manual execution via API endpoints
 * - GitHub Actions (for scheduled execution)
 * - External webhook cron services
 * - System cron (for self-hosted deployments)
 * 
 * The intelligent background sync approach automatically syncs users when:
 * - Any user performs a sync (triggers background sync for others)
 * - Users are active in the app (via useBackgroundSync hook)
 * - Manual trigger via /api/trigger-background-sync endpoint
 * 
 * Usage:
 * - For intelligent sync: Use triggerBackgroundSyncIfNeeded() method
 * - For direct execution: Run with npx tsx scripts/power-automate-cron.ts
 * - See docs/POWER_AUTOMATE_CRON_SETUP.md for detailed setup instructions
 */

import { db } from '../lib/drizzle';
import { userSettings } from '../db/schema';
import { PowerAutomateSyncService } from '../lib/powerAutomateSync';
import { isNotNull } from 'drizzle-orm';

interface SyncJobResult {
  userEmail: string;
  success: boolean;
  results: any[];
  errors: string[];
  timestamp: Date;
}

async function syncAllPowerAutomateUsers(): Promise<SyncJobResult[]> {
  const results: SyncJobResult[] = [];
  const syncService = PowerAutomateSyncService.getInstance();

  console.log('Starting Power Automate sync job for all users...');

  try {
    // Get all users with Power Automate URLs configured
    const usersWithPowerAutomate = await db
      .select({
        user_email: userSettings.user_email,
        calendarSources: userSettings.calendarSources
      })
      .from(userSettings)
      .where(
        // Users with Power Automate calendar sources
        isNotNull(userSettings.user_email)
      );

    console.log(`Found ${usersWithPowerAutomate.length} users to process`);

    for (const user of usersWithPowerAutomate) {
      const result: SyncJobResult = {
        userEmail: user.user_email,
        success: false,
        results: [],
        errors: [],
        timestamp: new Date()
      };

      try {
        console.log(`Processing user: ${user.user_email}`);

        // Find Power Automate sources
        const powerAutomateSources: Array<{ id: string; connectionData: string }> = [];

        // Check calendar sources
        if (user.calendarSources && Array.isArray(user.calendarSources)) {
          user.calendarSources.forEach((source: any) => {
            if (source.type === 'powerautomate' && source.connectionData) {
              powerAutomateSources.push({
                id: source.id || 'default',
                connectionData: source.connectionData
              });
            }
          });
        }

        if (powerAutomateSources.length === 0) {
          console.log(`No Power Automate sources found for user: ${user.user_email}`);
          result.success = true;
          results.push(result);
          continue;
        }

        // Sync each Power Automate source
        for (const source of powerAutomateSources) {
          try {
            console.log(`Syncing source ${source.id} for user: ${user.user_email}`);
            
            const syncResult = await syncService.syncUserEvents(
              user.user_email,
              source.connectionData,
              source.id,
              false // Don't force refresh for cron jobs
            );

            result.results.push({
              sourceId: source.id,
              ...syncResult
            });

            if (!syncResult.success) {
              result.errors.push(`Source ${source.id}: ${syncResult.errors.join(', ')}`);
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error syncing source ${source.id} for user ${user.user_email}:`, errorMessage);
            result.errors.push(`Source ${source.id}: ${errorMessage}`);
          }
        }

        result.success = result.errors.length === 0;
        console.log(`Completed sync for user: ${user.user_email}, success: ${result.success}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing user ${user.user_email}:`, errorMessage);
        result.errors.push(errorMessage);
      }

      results.push(result);
    }

    // Log summary
    const successfulUsers = results.filter(r => r.success).length;
    const totalUsers = results.length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`\n=== Power Automate Sync Job Summary ===`);
    console.log(`Total users processed: ${totalUsers}`);
    console.log(`Successful syncs: ${successfulUsers}`);
    console.log(`Failed syncs: ${totalUsers - successfulUsers}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Job completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('Fatal error in Power Automate sync job:', error);
  }

  return results;
}

// Main execution
if (require.main === module) {
  syncAllPowerAutomateUsers()
    .then(() => {
      console.log('Power Automate sync job completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Power Automate sync job failed:', error);
      process.exit(1);
    });
}

export { syncAllPowerAutomateUsers };