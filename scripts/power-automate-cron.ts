#!/usr/bin/env tsx

/**
 * Power Automate Sync Cron Job
 * 
 * This script can be run periodically (e.g., every 6 hours) to sync
 * Power Automate events for all users. It can be scheduled using:
 * 
 * - Vercel Cron Jobs (recommended)
 * - System cron
 * - GitHub Actions
 * - Any other cron service
 * 
 * Usage:
 * - For Vercel: Add to vercel.json
 * - For local: Run with tsx scripts/power-automate-cron.ts
 */

import { db } from '../lib/drizzle';
import { userSettings } from '../db/schema';
import { PowerAutomateSyncService } from '../lib/powerAutomateSync';
import { isNotNull, or } from 'drizzle-orm';

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
        calendarSources: userSettings.calendarSources,
        powerAutomateUrl: userSettings.powerAutomateUrl
      })
      .from(userSettings)
      .where(
        // Users with either calendar sources containing Power Automate or legacy powerAutomateUrl
        or(
          isNotNull(userSettings.powerAutomateUrl),
          isNotNull(userSettings.calendarSources)
        )
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

        // Check legacy powerAutomateUrl
        if (user.powerAutomateUrl && !powerAutomateSources.some(s => s.id === 'default')) {
          powerAutomateSources.push({
            id: 'default',
            connectionData: user.powerAutomateUrl
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