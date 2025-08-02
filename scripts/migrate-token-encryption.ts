#!/usr/bin/env tsx
/**
 * Migration Script: Encrypt OAuth Tokens
 * 
 * This script migrates existing unencrypted OAuth tokens in the accounts table
 * to encrypted format while maintaining backward compatibility.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { migrateTokensToEncrypted, decryptOAuthTokens } from '@/lib/tokenEncryption';
import { logger } from '@/lib/logger';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
const BATCH_SIZE = 50;

interface MigrationStats {
  processed: number;
  encrypted: number;
  skipped: number;
  errors: number;
}

async function migrateOAuthTokens(): Promise<MigrationStats> {
  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    logger.info('Starting OAuth token encryption migration', { isDryRun });

    // Get all accounts with tokens
    const allAccounts = await db.select().from(accounts);
    logger.info(`Found ${allAccounts.length} accounts to process`);

    for (const account of allAccounts) {
      try {
        processed++;

        // Check if tokens need encryption
        const needsEncryption = (
          (account.access_token && !account.access_token.startsWith('{')) ||
          (account.refresh_token && !account.refresh_token.startsWith('{')) ||
          (account.id_token && !account.id_token.startsWith('{'))
        );

        if (!needsEncryption) {
          skipped++;
          logger.debug(`Skipping account ${account.id} - tokens already encrypted`);
          continue;
        }

        // Migrate tokens to encrypted format
        const encryptedTokens = migrateTokensToEncrypted({
          access_token: account.access_token || undefined,
          refresh_token: account.refresh_token || undefined,
          id_token: account.id_token || undefined
        });

        if (!isDryRun) {
          // Update the account with encrypted tokens
          await db.update(accounts)
            .set({
              access_token: encryptedTokens.access_token,
              refresh_token: encryptedTokens.refresh_token,
              id_token: encryptedTokens.id_token
            })
            .where(eq(accounts.id, account.id));
        }

        encrypted++;
        logger.info(`Encrypted tokens for account ${account.id}`, { 
          hasAccessToken: !!encryptedTokens.access_token,
          hasRefreshToken: !!encryptedTokens.refresh_token,
          hasIdToken: !!encryptedTokens.id_token
        });

        // Log progress every 10 accounts
        if (processed % 10 === 0) {
          logger.info(`Migration progress: ${processed}/${allAccounts.length} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }

      } catch (error) {
        errors++;
        logger.error(`Error processing account ${account.id}`, { 
          error: error instanceof Error ? error.message : 'Unknown error',
          accountId: account.id,
          provider: account.provider
        });
      }
    }

    logger.info('OAuth token migration complete', { 
      processed, 
      encrypted, 
      skipped, 
      errors,
      isDryRun 
    });

    return { processed, encrypted, skipped, errors };

  } catch (error) {
    logger.error('Migration failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

async function verifyMigration(): Promise<void> {
  try {
    logger.info('Verifying migration results...');

    const sampleAccounts = await db.select().from(accounts).limit(5);
    
    for (const account of sampleAccounts) {
      if (account.access_token || account.refresh_token || account.id_token) {
        try {
          const decrypted = decryptOAuthTokens({
            access_token: account.access_token || undefined,
            refresh_token: account.refresh_token || undefined,
            id_token: account.id_token || undefined
          });

          logger.info(`Verification successful for account ${account.id}`, {
            hasDecryptedAccessToken: !!decrypted.access_token,
            hasDecryptedRefreshToken: !!decrypted.refresh_token,
            hasDecryptedIdToken: !!decrypted.id_token
          });
        } catch (error) {
          logger.error(`Verification failed for account ${account.id}`, { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    logger.info('Migration verification complete');
  } catch (error) {
    logger.error('Verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function main() {
  try {
    logger.info('Starting OAuth token encryption migration', { 
      isDryRun,
      batchSize: BATCH_SIZE 
    });

    const stats = await migrateOAuthTokens();
    
    if (!isDryRun) {
      await verifyMigration();
    }

    logger.info('Migration completed successfully', { 
      stats,
      isDryRun 
    });

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main();
}