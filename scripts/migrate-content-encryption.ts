#!/usr/bin/env tsx

/**
 * Migration Script: Encrypt User Content
 * 
 * This script migrates existing user content (notes, journal entries, etc.) 
 * to encrypted format while maintaining backward compatibility.
 * 
 * Safety Features:
 * - Non-destructive: Creates backups before migration
 * - Reversible: Can be rolled back if needed
 * - Incremental: Only processes unencrypted content
 * - Error handling: Continues processing even if individual records fail
 */

import { db } from '@/lib/drizzle';
import { notes, journalEntries, habitCompletions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { migrateContentToEncrypted, isContentEncrypted } from '@/lib/contentSecurity';

interface MigrationStats {
  notesProcessed: number;
  notesEncrypted: number;
  notesSkipped: number;
  notesErrors: number;
  journalEntriesProcessed: number;
  journalEntriesEncrypted: number;
  journalEntriesSkipped: number;
  journalEntriesErrors: number;
  habitCompletionsProcessed: number;
  habitCompletionsEncrypted: number;
  habitCompletionsSkipped: number;
  habitCompletionsErrors: number;
}

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

async function createBackupTables(): Promise<void> {
  console.log('Creating backup tables...');
  
  try {
    // Create backup tables with today's date
    const backupSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notes_backup_${sql.raw(backupSuffix)} AS 
      SELECT * FROM notes;
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS journal_entries_backup_${sql.raw(backupSuffix)} AS 
      SELECT * FROM journal_entries;
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "habitCompletions_backup_${sql.raw(backupSuffix)}" AS 
      SELECT * FROM "habitCompletions";
    `);
    
    console.log(`✅ Backup tables created with suffix: ${backupSuffix}`);
  } catch (error) {
    console.error('❌ Failed to create backup tables:', error);
    throw error;
  }
}

async function migrateNotes(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('\n📝 Migrating notes...');
  
  let offset = 0;
  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;
  
  while (true) {
    const batch = await db.select()
      .from(notes)
      .limit(BATCH_SIZE)
      .offset(offset);
    
    if (batch.length === 0) break;
    
    for (const note of batch) {
      processed++;
      
      try {
        // Check if content is already encrypted
        let contentNeedsEncryption = false;
        let titleNeedsEncryption = false;
        let agendaNeedsEncryption = false;
        let aiSummaryNeedsEncryption = false;
        
        if (note.content) {
          try {
            const parsed = JSON.parse(note.content);
            if (!isContentEncrypted(parsed)) {
              contentNeedsEncryption = true;
            }
          } catch {
            // Not JSON, treat as plain text that needs encryption
            contentNeedsEncryption = true;
          }
        }
        
        if (note.title) {
          try {
            const parsed = JSON.parse(note.title);
            if (!isContentEncrypted(parsed)) {
              titleNeedsEncryption = true;
            }
          } catch {
            titleNeedsEncryption = true;
          }
        }
        
        if (note.agenda) {
          try {
            const parsed = JSON.parse(note.agenda);
            if (!isContentEncrypted(parsed)) {
              agendaNeedsEncryption = true;
            }
          } catch {
            agendaNeedsEncryption = true;
          }
        }
        
        if (note.aiSummary) {
          try {
            const parsed = JSON.parse(note.aiSummary);
            if (!isContentEncrypted(parsed)) {
              aiSummaryNeedsEncryption = true;
            }
          } catch {
            aiSummaryNeedsEncryption = true;
          }
        }
        
        if (!contentNeedsEncryption && !titleNeedsEncryption && !agendaNeedsEncryption && !aiSummaryNeedsEncryption) {
          skipped++;
          continue;
        }
        
        const updateData: any = {};
        
        if (contentNeedsEncryption && note.content) {
          updateData.content = migrateContentToEncrypted(note.content);
        }
        
        if (titleNeedsEncryption && note.title) {
          updateData.title = migrateContentToEncrypted(note.title);
        }
        
        if (agendaNeedsEncryption && note.agenda) {
          updateData.agenda = migrateContentToEncrypted(note.agenda);
        }
        
        if (aiSummaryNeedsEncryption && note.aiSummary) {
          updateData.aiSummary = migrateContentToEncrypted(note.aiSummary);
        }
        
        if (Object.keys(updateData).length > 0) {
          if (!DRY_RUN) {
            await db.update(notes)
              .set(updateData)
              .where(eq(notes.id, note.id));
          }
          encrypted++;
          
          if (processed % 10 === 0) {
            console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing note ${note.id}:`, error);
        errors++;
      }
    }
    
    offset += BATCH_SIZE;
  }
  
  return { processed, encrypted, skipped, errors };
}

async function migrateJournalEntries(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('\n📖 Migrating journal entries...');
  
  let offset = 0;
  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;
  
  while (true) {
    const batch = await db.select()
      .from(journalEntries)
      .limit(BATCH_SIZE)
      .offset(offset);
    
    if (batch.length === 0) break;
    
    for (const entry of batch) {
      processed++;
      
      try {
        if (!entry.content) {
          skipped++;
          continue;
        }
        
        // Check if content is already encrypted
        let needsEncryption = false;
        try {
          const parsed = JSON.parse(entry.content);
          if (!isContentEncrypted(parsed)) {
            needsEncryption = true;
          }
        } catch {
          // Not JSON, treat as plain text that needs encryption
          needsEncryption = true;
        }
        
        if (!needsEncryption) {
          skipped++;
          continue;
        }
        
        const encryptedContent = migrateContentToEncrypted(entry.content);
        
        if (!DRY_RUN) {
          await db.update(journalEntries)
            .set({ content: encryptedContent })
            .where(eq(journalEntries.id, entry.id));
        }
        
        encrypted++;
        
        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing journal entry ${entry.id}:`, error);
        errors++;
      }
    }
    
    offset += BATCH_SIZE;
  }
  
  return { processed, encrypted, skipped, errors };
}

async function migrateHabitCompletions(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('\n🎯 Migrating habit completion notes...');
  
  let offset = 0;
  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;
  
  while (true) {
    const batch = await db.select()
      .from(habitCompletions)
      .limit(BATCH_SIZE)
      .offset(offset);
    
    if (batch.length === 0) break;
    
    for (const completion of batch) {
      processed++;
      
      try {
        if (!completion.notes) {
          skipped++;
          continue;
        }
        
        // Check if notes are already encrypted
        let needsEncryption = false;
        try {
          const parsed = JSON.parse(completion.notes);
          if (!isContentEncrypted(parsed)) {
            needsEncryption = true;
          }
        } catch {
          // Not JSON, treat as plain text that needs encryption
          needsEncryption = true;
        }
        
        if (!needsEncryption) {
          skipped++;
          continue;
        }
        
        const encryptedNotes = migrateContentToEncrypted(completion.notes);
        
        if (!DRY_RUN) {
          await db.update(habitCompletions)
            .set({ notes: encryptedNotes })
            .where(eq(habitCompletions.id, completion.id));
        }
        
        encrypted++;
        
        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing habit completion ${completion.id}:`, error);
        errors++;
      }
    }
    
    offset += BATCH_SIZE;
  }
  
  return { processed, encrypted, skipped, errors };
}

async function main(): Promise<void> {
  console.log('🔐 Starting Content Encryption Migration');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
  
  // Check if encryption key is configured
  if (!process.env.CONTENT_ENCRYPTION_KEY) {
    console.error('❌ CONTENT_ENCRYPTION_KEY environment variable is required');
    console.log('Please set a strong encryption key before running this migration.');
    console.log('Example: export CONTENT_ENCRYPTION_KEY="your-very-long-and-secure-encryption-key-here"');
    process.exit(1);
  }
  
  const stats: MigrationStats = {
    notesProcessed: 0,
    notesEncrypted: 0,
    notesSkipped: 0,
    notesErrors: 0,
    journalEntriesProcessed: 0,
    journalEntriesEncrypted: 0,
    journalEntriesSkipped: 0,
    journalEntriesErrors: 0,
    habitCompletionsProcessed: 0,
    habitCompletionsEncrypted: 0,
    habitCompletionsSkipped: 0,
    habitCompletionsErrors: 0,
  };
  
  try {
    // Create backups before migration
    if (!DRY_RUN) {
      await createBackupTables();
    } else {
      console.log('⚠️  Skipping backup creation in dry run mode');
    }
    
    // Migrate each table
    const notesResult = await migrateNotes();
    stats.notesProcessed = notesResult.processed;
    stats.notesEncrypted = notesResult.encrypted;
    stats.notesSkipped = notesResult.skipped;
    stats.notesErrors = notesResult.errors;
    
    const journalResult = await migrateJournalEntries();
    stats.journalEntriesProcessed = journalResult.processed;
    stats.journalEntriesEncrypted = journalResult.encrypted;
    stats.journalEntriesSkipped = journalResult.skipped;
    stats.journalEntriesErrors = journalResult.errors;
    
    const habitsResult = await migrateHabitCompletions();
    stats.habitCompletionsProcessed = habitsResult.processed;
    stats.habitCompletionsEncrypted = habitsResult.encrypted;
    stats.habitCompletionsSkipped = habitsResult.skipped;
    stats.habitCompletionsErrors = habitsResult.errors;
    
    // Print final summary
    console.log('\n🎉 Migration completed!');
    console.log('\n📊 Summary:');
    console.log(`Notes: ${stats.notesProcessed} processed, ${stats.notesEncrypted} encrypted, ${stats.notesSkipped} skipped, ${stats.notesErrors} errors`);
    console.log(`Journal Entries: ${stats.journalEntriesProcessed} processed, ${stats.journalEntriesEncrypted} encrypted, ${stats.journalEntriesSkipped} skipped, ${stats.journalEntriesErrors} errors`);
    console.log(`Habit Completions: ${stats.habitCompletionsProcessed} processed, ${stats.habitCompletionsEncrypted} encrypted, ${stats.habitCompletionsSkipped} skipped, ${stats.habitCompletionsErrors} errors`);
    
    const totalProcessed = stats.notesProcessed + stats.journalEntriesProcessed + stats.habitCompletionsProcessed;
    const totalEncrypted = stats.notesEncrypted + stats.journalEntriesEncrypted + stats.habitCompletionsEncrypted;
    const totalErrors = stats.notesErrors + stats.journalEntriesErrors + stats.habitCompletionsErrors;
    
    console.log(`\nTotal: ${totalProcessed} processed, ${totalEncrypted} encrypted, ${totalErrors} errors`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. No changes were made to the database.');
      console.log('Run without --dry-run to perform the actual migration.');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('Backup tables have been created for rollback if needed.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Migration interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Migration terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});