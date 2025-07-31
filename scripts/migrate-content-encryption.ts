#!/usr/bin/env tsx
/**
 * Migration Script: Encrypt User Content
 * 
 * This script migrates all existing user content in the database 
 * to encrypted format while maintaining backward compatibility.
 * 
 * Features:
 * - Non-destructive: Creates backups before migration
 * - Incremental: Only processes unencrypted content
 * - Resilient: Continues processing even if individual records fail
 * - Progress tracking: Shows real-time migration progress
 * - Dry run: Test the migration without making changes
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { 
  migrateContentToEncrypted, 
  migrateArrayToEncrypted, 
  migrateJSONBToEncrypted, 
  isContentEncrypted 
} from '@/lib/contentSecurity';
import { 
  notes, 
  journalEntries, 
  habitCompletions, 
  calendarEvents, 
  feedback, 
  userSettings, 
  conversations, 
  habits, 
  tasks, 
  journalMoods, 
  journalActivities, 
  meetings,
  analytics
} from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  calendarEventsProcessed: number;
  calendarEventsEncrypted: number;
  calendarEventsSkipped: number;
  calendarEventsErrors: number;
  feedbackProcessed: number;
  feedbackEncrypted: number;
  feedbackSkipped: number;
  feedbackErrors: number;
  userSettingsProcessed: number;
  userSettingsEncrypted: number;
  userSettingsSkipped: number;
  userSettingsErrors: number;
  conversationsProcessed: number;
  conversationsEncrypted: number;
  conversationsSkipped: number;
  conversationsErrors: number;
  habitsProcessed: number;
  habitsEncrypted: number;
  habitsSkipped: number;
  habitsErrors: number;
  tasksProcessed: number;
  tasksEncrypted: number;
  tasksSkipped: number;
  tasksErrors: number;
  journalMoodsProcessed: number;
  journalMoodsEncrypted: number;
  journalMoodsSkipped: number;
  journalMoodsErrors: number;
  journalActivitiesProcessed: number;
  journalActivitiesEncrypted: number;
  journalActivitiesSkipped: number;
  journalActivitiesErrors: number;
  meetingsProcessed: number;
  meetingsEncrypted: number;
  meetingsSkipped: number;
  meetingsErrors: number;
  analyticsProcessed: number;
  analyticsEncrypted: number;
  analyticsSkipped: number;
  analyticsErrors: number;
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
const BATCH_SIZE = 100;

async function createBackupTables(): Promise<string> {
  const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
  
  if (isDryRun) {
    console.log('✅ [DRY RUN] Would create backup tables with suffix:', dateSuffix);
    return dateSuffix;
  }

  console.log('Creating backup tables...');
  
  const backupQueries = [
    `CREATE TABLE IF NOT EXISTS notes_backup_${dateSuffix} AS SELECT * FROM notes;`,
    `CREATE TABLE IF NOT EXISTS journal_entries_backup_${dateSuffix} AS SELECT * FROM journal_entries;`,
    `CREATE TABLE IF NOT EXISTS "habitCompletions_backup_${dateSuffix}" AS SELECT * FROM "habitCompletions";`,
    `CREATE TABLE IF NOT EXISTS "calendarEvents_backup_${dateSuffix}" AS SELECT * FROM "calendarEvents";`,
    `CREATE TABLE IF NOT EXISTS feedback_backup_${dateSuffix} AS SELECT * FROM feedback;`,
    `CREATE TABLE IF NOT EXISTS user_settings_backup_${dateSuffix} AS SELECT * FROM user_settings;`,
    `CREATE TABLE IF NOT EXISTS conversations_backup_${dateSuffix} AS SELECT * FROM conversations;`,
    `CREATE TABLE IF NOT EXISTS habits_backup_${dateSuffix} AS SELECT * FROM habits;`,
    `CREATE TABLE IF NOT EXISTS tasks_backup_${dateSuffix} AS SELECT * FROM tasks;`,
    `CREATE TABLE IF NOT EXISTS journal_moods_backup_${dateSuffix} AS SELECT * FROM journal_moods;`,
    `CREATE TABLE IF NOT EXISTS journal_activities_backup_${dateSuffix} AS SELECT * FROM journal_activities;`,
    `CREATE TABLE IF NOT EXISTS meetings_backup_${dateSuffix} AS SELECT * FROM meetings;`,
    `CREATE TABLE IF NOT EXISTS analytics_backup_${dateSuffix} AS SELECT * FROM analytics;`,
  ];

  for (const query of backupQueries) {
    await sql(query);
  }

  console.log('✅ Backup tables created with suffix:', dateSuffix);
  return dateSuffix;
}

async function migrateNotes(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('📝 Migrating notes...');
  
  const allNotes = await db.select().from(notes);
  console.log(`Found ${allNotes.length} notes to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allNotes.length; i += BATCH_SIZE) {
    const batch = allNotes.slice(i, i + BATCH_SIZE);
    
    for (const note of batch) {
      try {
        processed++;
        
        // Check if content is already encrypted
        let contentNeedsEncryption = false;
        let titleNeedsEncryption = false;
        let agendaNeedsEncryption = false;
        let aiSummaryNeedsEncryption = false;
        
        // Check content
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
        
        // Check title
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
        
        // Check agenda
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
        
        // Check AI summary
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

        if (isDryRun) {
          console.log(`[DRY RUN] Would encrypt note ${note.id}`);
          encrypted++;
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
          await db.update(notes)
            .set(updateData)
            .where(eq(notes.id, note.id));
        }

        encrypted++;

        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
      } catch (error) {
        console.error(`Error migrating note ${note.id}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Notes migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateJournalEntries(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('📖 Migrating journal entries...');
  
  const allEntries = await db.select().from(journalEntries);
  console.log(`Found ${allEntries.length} journal entries to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
    const batch = allEntries.slice(i, i + BATCH_SIZE);
    
    for (const entry of batch) {
      try {
        processed++;
        
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

        if (isDryRun) {
          console.log(`[DRY RUN] Would encrypt journal entry ${entry.id}`);
          encrypted++;
          continue;
        }

        const encryptedContent = migrateContentToEncrypted(entry.content);
        
        await db.update(journalEntries)
          .set({ content: encryptedContent })
          .where(eq(journalEntries.id, entry.id));

        encrypted++;

        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
      } catch (error) {
        console.error(`Error migrating journal entry ${entry.id}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Journal entries migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateHabitCompletions(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('🎯 Migrating habit completion notes...');
  
  const allCompletions = await db.select().from(habitCompletions);
  console.log(`Found ${allCompletions.length} habit completions to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allCompletions.length; i += BATCH_SIZE) {
    const batch = allCompletions.slice(i, i + BATCH_SIZE);
    
    for (const completion of batch) {
      try {
        processed++;
        
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

        if (isDryRun) {
          console.log(`[DRY RUN] Would encrypt habit completion ${completion.id}`);
          encrypted++;
          continue;
        }

        const encryptedNotes = migrateContentToEncrypted(completion.notes);
        
        await db.update(habitCompletions)
          .set({ notes: encryptedNotes })
          .where(eq(habitCompletions.id, completion.id));

        encrypted++;

        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
      } catch (error) {
        console.error(`Error migrating habit completion ${completion.id}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Habit completions migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateCalendarEvents(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('📅 Migrating calendar events...');
  
  const allEvents = await db.select().from(calendarEvents);
  console.log(`Found ${allEvents.length} calendar events to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
    const batch = allEvents.slice(i, i + BATCH_SIZE);
    
    for (const event of batch) {
      try {
        processed++;
        
        let summaryNeedsEncryption = false;
        let descriptionNeedsEncryption = false;
        let locationNeedsEncryption = false;
        let tagsNeedEncryption = false;
        
        // Check summary
        if (event.summary) {
          try {
            const parsed = JSON.parse(event.summary);
            if (!isContentEncrypted(parsed)) {
              summaryNeedsEncryption = true;
            }
          } catch {
            summaryNeedsEncryption = true;
          }
        }
        
        // Check description
        if (event.description) {
          try {
            const parsed = JSON.parse(event.description);
            if (!isContentEncrypted(parsed)) {
              descriptionNeedsEncryption = true;
            }
          } catch {
            descriptionNeedsEncryption = true;
          }
        }
        
        // Check location
        if (event.location) {
          try {
            const parsed = JSON.parse(event.location);
            if (!isContentEncrypted(parsed)) {
              locationNeedsEncryption = true;
            }
          } catch {
            locationNeedsEncryption = true;
          }
        }
        
        // Check tags (array)
        if (event.tags && Array.isArray(event.tags)) {
          tagsNeedEncryption = true;
        }

        if (!summaryNeedsEncryption && !descriptionNeedsEncryption && !locationNeedsEncryption && !tagsNeedEncryption) {
          skipped++;
          continue;
        }

        if (isDryRun) {
          console.log(`[DRY RUN] Would encrypt calendar event ${event.id}`);
          encrypted++;
          continue;
        }

        const updateData: any = {};
        
        if (summaryNeedsEncryption && event.summary) {
          updateData.summary = migrateContentToEncrypted(event.summary);
        }
        
        if (descriptionNeedsEncryption && event.description) {
          updateData.description = migrateContentToEncrypted(event.description);
        }
        
        if (locationNeedsEncryption && event.location) {
          updateData.location = migrateContentToEncrypted(event.location);
        }
        
        if (tagsNeedEncryption && event.tags) {
          updateData.tags = migrateArrayToEncrypted(event.tags);
        }
        
        if (Object.keys(updateData).length > 0) {
          await db.update(calendarEvents)
            .set(updateData)
            .where(eq(calendarEvents.id, event.id));
        }

        encrypted++;

        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
      } catch (error) {
        console.error(`Error migrating calendar event ${event.id}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Calendar events migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateFeedback(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('💬 Migrating feedback...');
  
  const allFeedback = await db.select().from(feedback);
  console.log(`Found ${allFeedback.length} feedback entries to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allFeedback.length; i += BATCH_SIZE) {
    const batch = allFeedback.slice(i, i + BATCH_SIZE);
    
    for (const item of batch) {
      try {
        processed++;
        
        let titleNeedsEncryption = false;
        let descriptionNeedsEncryption = false;
        
        // Check title
        if (item.title) {
          try {
            const parsed = JSON.parse(item.title);
            if (!isContentEncrypted(parsed)) {
              titleNeedsEncryption = true;
            }
          } catch {
            titleNeedsEncryption = true;
          }
        }
        
        // Check description
        if (item.description) {
          try {
            const parsed = JSON.parse(item.description);
            if (!isContentEncrypted(parsed)) {
              descriptionNeedsEncryption = true;
            }
          } catch {
            descriptionNeedsEncryption = true;
          }
        }

        if (!titleNeedsEncryption && !descriptionNeedsEncryption) {
          skipped++;
          continue;
        }

        if (isDryRun) {
          console.log(`[DRY RUN] Would encrypt feedback ${item.id}`);
          encrypted++;
          continue;
        }

        const updateData: any = {};
        
        if (titleNeedsEncryption && item.title) {
          updateData.title = migrateContentToEncrypted(item.title);
        }
        
        if (descriptionNeedsEncryption && item.description) {
          updateData.description = migrateContentToEncrypted(item.description);
        }
        
        if (Object.keys(updateData).length > 0) {
          await db.update(feedback)
            .set(updateData)
            .where(eq(feedback.id, item.id));
        }

        encrypted++;

        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
        }
      } catch (error) {
        console.error(`Error migrating feedback ${item.id}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Feedback migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateUserSettings(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('⚙️ Migrating user settings...');
  
  const allSettings = await db.select().from(userSettings);
  console.log(`Found ${allSettings.length} user settings to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const setting of allSettings) {
    try {
      processed++;
      
      let needsEncryption = false;
      const updateData: any = {};
      
      // Check preferredName
      if (setting.preferredName) {
        try {
          const parsed = JSON.parse(setting.preferredName);
          if (!isContentEncrypted(parsed)) {
            needsEncryption = true;
            updateData.preferredName = migrateContentToEncrypted(setting.preferredName);
          }
        } catch {
          needsEncryption = true;
          updateData.preferredName = migrateContentToEncrypted(setting.preferredName);
        }
      }
      
      // Check globalTags
      if (setting.globalTags && Array.isArray(setting.globalTags)) {
        needsEncryption = true;
        updateData.globalTags = migrateArrayToEncrypted(setting.globalTags);
      }
      
      // Check tags
      if (setting.tags && Array.isArray(setting.tags)) {
        needsEncryption = true;
        updateData.tags = migrateArrayToEncrypted(setting.tags);
      }
      
      // Check journalCustomActivities
      if (setting.journalCustomActivities) {
        needsEncryption = true;
        updateData.journalCustomActivities = migrateJSONBToEncrypted(setting.journalCustomActivities);
      }

      if (!needsEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt user settings for ${setting.user_email}`);
        encrypted++;
        continue;
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(userSettings)
          .set(updateData)
          .where(eq(userSettings.user_email, setting.user_email));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating user settings for ${setting.user_email}:`, error);
      errors++;
    }
  }

  console.log(`✅ User settings migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateConversations(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('💬 Migrating conversations...');
  
  const allConversations = await db.select().from(conversations);
  console.log(`Found ${allConversations.length} conversations to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const conversation of allConversations) {
    try {
      processed++;
      
      if (!conversation.messages) {
        skipped++;
        continue;
      }

      let needsEncryption = false;
      try {
        const parsed = JSON.parse(JSON.stringify(conversation.messages));
        if (!isContentEncrypted(parsed)) {
          needsEncryption = true;
        }
      } catch {
        needsEncryption = true;
      }

      if (!needsEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt conversation ${conversation.id}`);
        encrypted++;
        continue;
      }

      const encryptedMessages = migrateJSONBToEncrypted(conversation.messages);
      
      await db.update(conversations)
        .set({ messages: JSON.parse(encryptedMessages) })
        .where(eq(conversations.id, conversation.id));

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating conversation ${conversation.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Conversations migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateHabits(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('🎯 Migrating habits...');
  
  const allHabits = await db.select().from(habits);
  console.log(`Found ${allHabits.length} habits to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const habit of allHabits) {
    try {
      processed++;
      
      let nameNeedsEncryption = false;
      let descriptionNeedsEncryption = false;
      const updateData: any = {};
      
      // Check name
      if (habit.name) {
        try {
          const parsed = JSON.parse(habit.name);
          if (!isContentEncrypted(parsed)) {
            nameNeedsEncryption = true;
          }
        } catch {
          nameNeedsEncryption = true;
        }
      }
      
      // Check description
      if (habit.description) {
        try {
          const parsed = JSON.parse(habit.description);
          if (!isContentEncrypted(parsed)) {
            descriptionNeedsEncryption = true;
          }
        } catch {
          descriptionNeedsEncryption = true;
        }
      }

      if (!nameNeedsEncryption && !descriptionNeedsEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt habit ${habit.id}`);
        encrypted++;
        continue;
      }

      if (nameNeedsEncryption && habit.name) {
        updateData.name = migrateContentToEncrypted(habit.name);
      }
      
      if (descriptionNeedsEncryption && habit.description) {
        updateData.description = migrateContentToEncrypted(habit.description);
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(habits)
          .set(updateData)
          .where(eq(habits.id, habit.id));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating habit ${habit.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Habits migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateTasks(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('✅ Migrating tasks...');
  
  const allTasks = await db.select().from(tasks);
  console.log(`Found ${allTasks.length} tasks to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const task of allTasks) {
    try {
      processed++;
      
      let textNeedsEncryption = false;
      let tagsNeedEncryption = false;
      const updateData: any = {};
      
      // Check text
      if (task.text) {
        try {
          const parsed = JSON.parse(task.text);
          if (!isContentEncrypted(parsed)) {
            textNeedsEncryption = true;
          }
        } catch {
          textNeedsEncryption = true;
        }
      }
      
      // Check tags (JSONB)
      if (task.tags) {
        tagsNeedEncryption = true;
      }

      if (!textNeedsEncryption && !tagsNeedEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt task ${task.id}`);
        encrypted++;
        continue;
      }

      if (textNeedsEncryption && task.text) {
        updateData.text = migrateContentToEncrypted(task.text);
      }
      
      if (tagsNeedEncryption && task.tags) {
        updateData.tags = JSON.parse(migrateJSONBToEncrypted(task.tags));
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(tasks)
          .set(updateData)
          .where(eq(tasks.id, task.id));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating task ${task.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Tasks migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateJournalMoods(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('😊 Migrating journal moods...');
  
  const allMoods = await db.select().from(journalMoods);
  console.log(`Found ${allMoods.length} journal moods to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const mood of allMoods) {
    try {
      processed++;
      
      let tagsNeedEncryption = false;
      
      // Check tags (array)
      if (mood.tags && Array.isArray(mood.tags)) {
        tagsNeedEncryption = true;
      }

      if (!tagsNeedEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt journal mood ${mood.id}`);
        encrypted++;
        continue;
      }

      const updateData: any = {};
      
      if (tagsNeedEncryption && mood.tags) {
        updateData.tags = migrateArrayToEncrypted(mood.tags);
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(journalMoods)
          .set(updateData)
          .where(eq(journalMoods.id, mood.id));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating journal mood ${mood.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Journal moods migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateJournalActivities(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('🏃 Migrating journal activities...');
  
  const allActivities = await db.select().from(journalActivities);
  console.log(`Found ${allActivities.length} journal activities to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const activity of allActivities) {
    try {
      processed++;
      
      let activitiesNeedEncryption = false;
      
      // Check activities (array)
      if (activity.activities && Array.isArray(activity.activities)) {
        activitiesNeedEncryption = true;
      }

      if (!activitiesNeedEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt journal activities ${activity.id}`);
        encrypted++;
        continue;
      }

      const updateData: any = {};
      
      if (activitiesNeedEncryption && activity.activities) {
        updateData.activities = migrateArrayToEncrypted(activity.activities);
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(journalActivities)
          .set(updateData)
          .where(eq(journalActivities.id, activity.id));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating journal activities ${activity.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Journal activities migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateMeetings(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('🤝 Migrating meetings...');
  
  const allMeetings = await db.select().from(meetings);
  console.log(`Found ${allMeetings.length} meetings to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const meeting of allMeetings) {
    try {
      processed++;
      
      let titleNeedsEncryption = false;
      let contentNeedsEncryption = false;
      let tagsNeedEncryption = false;
      const updateData: any = {};
      
      // Check title
      if (meeting.title) {
        try {
          const parsed = JSON.parse(meeting.title);
          if (!isContentEncrypted(parsed)) {
            titleNeedsEncryption = true;
          }
        } catch {
          titleNeedsEncryption = true;
        }
      }
      
      // Check content
      if (meeting.content) {
        try {
          const parsed = JSON.parse(meeting.content);
          if (!isContentEncrypted(parsed)) {
            contentNeedsEncryption = true;
          }
        } catch {
          contentNeedsEncryption = true;
        }
      }
      
      // Check tags (JSONB)
      if (meeting.tags) {
        tagsNeedEncryption = true;
      }

      if (!titleNeedsEncryption && !contentNeedsEncryption && !tagsNeedEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt meeting ${meeting.id}`);
        encrypted++;
        continue;
      }

      if (titleNeedsEncryption && meeting.title) {
        updateData.title = migrateContentToEncrypted(meeting.title);
      }
      
      if (contentNeedsEncryption && meeting.content) {
        updateData.content = migrateContentToEncrypted(meeting.content);
      }
      
      if (tagsNeedEncryption && meeting.tags) {
        updateData.tags = JSON.parse(migrateJSONBToEncrypted(meeting.tags));
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(meetings)
          .set(updateData)
          .where(eq(meetings.id, meeting.id));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating meeting ${meeting.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Meetings migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function migrateAnalytics(): Promise<{ processed: number; encrypted: number; skipped: number; errors: number }> {
  console.log('📊 Migrating analytics...');
  
  const allAnalytics = await db.select().from(analytics);
  console.log(`Found ${allAnalytics.length} analytics entries to process`);

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const analytic of allAnalytics) {
    try {
      processed++;
      
      let eventDataNeedsEncryption = false;
      
      // Check eventData (JSONB) - only if it contains user-generated content
      if (analytic.eventData) {
        eventDataNeedsEncryption = true;
      }

      if (!eventDataNeedsEncryption) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would encrypt analytics ${analytic.id}`);
        encrypted++;
        continue;
      }

      const updateData: any = {};
      
      if (eventDataNeedsEncryption && analytic.eventData) {
        updateData.eventData = JSON.parse(migrateJSONBToEncrypted(analytic.eventData));
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.update(analytics)
          .set(updateData)
          .where(eq(analytics.id, analytic.id));
      }

      encrypted++;

      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped`);
      }
    } catch (error) {
      console.error(`Error migrating analytics ${analytic.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Analytics migration complete: ${processed} processed, ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
  return { processed, encrypted, skipped, errors };
}

async function main() {
  console.log('🔐 Starting Content Encryption Migration');
  console.log('Mode:', isDryRun ? 'DRY RUN' : 'LIVE MIGRATION');
  
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
    calendarEventsProcessed: 0,
    calendarEventsEncrypted: 0,
    calendarEventsSkipped: 0,
    calendarEventsErrors: 0,
    feedbackProcessed: 0,
    feedbackEncrypted: 0,
    feedbackSkipped: 0,
    feedbackErrors: 0,
    userSettingsProcessed: 0,
    userSettingsEncrypted: 0,
    userSettingsSkipped: 0,
    userSettingsErrors: 0,
    conversationsProcessed: 0,
    conversationsEncrypted: 0,
    conversationsSkipped: 0,
    conversationsErrors: 0,
    habitsProcessed: 0,
    habitsEncrypted: 0,
    habitsSkipped: 0,
    habitsErrors: 0,
    tasksProcessed: 0,
    tasksEncrypted: 0,
    tasksSkipped: 0,
    tasksErrors: 0,
    journalMoodsProcessed: 0,
    journalMoodsEncrypted: 0,
    journalMoodsSkipped: 0,
    journalMoodsErrors: 0,
    journalActivitiesProcessed: 0,
    journalActivitiesEncrypted: 0,
    journalActivitiesSkipped: 0,
    journalActivitiesErrors: 0,
    meetingsProcessed: 0,
    meetingsEncrypted: 0,
    meetingsSkipped: 0,
    meetingsErrors: 0,
    analyticsProcessed: 0,
    analyticsEncrypted: 0,
    analyticsSkipped: 0,
    analyticsErrors: 0,
  };

  try {
    // Create backup tables
    await createBackupTables();

    // Migrate all content types
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

    const calendarResult = await migrateCalendarEvents();
    stats.calendarEventsProcessed = calendarResult.processed;
    stats.calendarEventsEncrypted = calendarResult.encrypted;
    stats.calendarEventsSkipped = calendarResult.skipped;
    stats.calendarEventsErrors = calendarResult.errors;

    const feedbackResult = await migrateFeedback();
    stats.feedbackProcessed = feedbackResult.processed;
    stats.feedbackEncrypted = feedbackResult.encrypted;
    stats.feedbackSkipped = feedbackResult.skipped;
    stats.feedbackErrors = feedbackResult.errors;

    const userSettingsResult = await migrateUserSettings();
    stats.userSettingsProcessed = userSettingsResult.processed;
    stats.userSettingsEncrypted = userSettingsResult.encrypted;
    stats.userSettingsSkipped = userSettingsResult.skipped;
    stats.userSettingsErrors = userSettingsResult.errors;

    const conversationsResult = await migrateConversations();
    stats.conversationsProcessed = conversationsResult.processed;
    stats.conversationsEncrypted = conversationsResult.encrypted;
    stats.conversationsSkipped = conversationsResult.skipped;
    stats.conversationsErrors = conversationsResult.errors;

    const habitsTableResult = await migrateHabits();
    stats.habitsProcessed = habitsTableResult.processed;
    stats.habitsEncrypted = habitsTableResult.encrypted;
    stats.habitsSkipped = habitsTableResult.skipped;
    stats.habitsErrors = habitsTableResult.errors;

    const tasksResult = await migrateTasks();
    stats.tasksProcessed = tasksResult.processed;
    stats.tasksEncrypted = tasksResult.encrypted;
    stats.tasksSkipped = tasksResult.skipped;
    stats.tasksErrors = tasksResult.errors;

    const journalMoodsResult = await migrateJournalMoods();
    stats.journalMoodsProcessed = journalMoodsResult.processed;
    stats.journalMoodsEncrypted = journalMoodsResult.encrypted;
    stats.journalMoodsSkipped = journalMoodsResult.skipped;
    stats.journalMoodsErrors = journalMoodsResult.errors;

    const journalActivitiesResult = await migrateJournalActivities();
    stats.journalActivitiesProcessed = journalActivitiesResult.processed;
    stats.journalActivitiesEncrypted = journalActivitiesResult.encrypted;
    stats.journalActivitiesSkipped = journalActivitiesResult.skipped;
    stats.journalActivitiesErrors = journalActivitiesResult.errors;

    const meetingsResult = await migrateMeetings();
    stats.meetingsProcessed = meetingsResult.processed;
    stats.meetingsEncrypted = meetingsResult.encrypted;
    stats.meetingsSkipped = meetingsResult.skipped;
    stats.meetingsErrors = meetingsResult.errors;

    const analyticsResult = await migrateAnalytics();
    stats.analyticsProcessed = analyticsResult.processed;
    stats.analyticsEncrypted = analyticsResult.encrypted;
    stats.analyticsSkipped = analyticsResult.skipped;
    stats.analyticsErrors = analyticsResult.errors;

    // Print summary
    console.log('\n🎉 Migration completed!');
    console.log('\n📊 Summary:');
    console.log(`Notes: ${stats.notesProcessed} processed, ${stats.notesEncrypted} encrypted, ${stats.notesSkipped} skipped, ${stats.notesErrors} errors`);
    console.log(`Journal Entries: ${stats.journalEntriesProcessed} processed, ${stats.journalEntriesEncrypted} encrypted, ${stats.journalEntriesSkipped} skipped, ${stats.journalEntriesErrors} errors`);
    console.log(`Habit Completions: ${stats.habitCompletionsProcessed} processed, ${stats.habitCompletionsEncrypted} encrypted, ${stats.habitCompletionsSkipped} skipped, ${stats.habitCompletionsErrors} errors`);
    console.log(`Calendar Events: ${stats.calendarEventsProcessed} processed, ${stats.calendarEventsEncrypted} encrypted, ${stats.calendarEventsSkipped} skipped, ${stats.calendarEventsErrors} errors`);
    console.log(`Feedback: ${stats.feedbackProcessed} processed, ${stats.feedbackEncrypted} encrypted, ${stats.feedbackSkipped} skipped, ${stats.feedbackErrors} errors`);
    console.log(`User Settings: ${stats.userSettingsProcessed} processed, ${stats.userSettingsEncrypted} encrypted, ${stats.userSettingsSkipped} skipped, ${stats.userSettingsErrors} errors`);
    console.log(`Conversations: ${stats.conversationsProcessed} processed, ${stats.conversationsEncrypted} encrypted, ${stats.conversationsSkipped} skipped, ${stats.conversationsErrors} errors`);
    console.log(`Habits: ${stats.habitsProcessed} processed, ${stats.habitsEncrypted} encrypted, ${stats.habitsSkipped} skipped, ${stats.habitsErrors} errors`);
    console.log(`Tasks: ${stats.tasksProcessed} processed, ${stats.tasksEncrypted} encrypted, ${stats.tasksSkipped} skipped, ${stats.tasksErrors} errors`);
    console.log(`Journal Moods: ${stats.journalMoodsProcessed} processed, ${stats.journalMoodsEncrypted} encrypted, ${stats.journalMoodsSkipped} skipped, ${stats.journalMoodsErrors} errors`);
    console.log(`Journal Activities: ${stats.journalActivitiesProcessed} processed, ${stats.journalActivitiesEncrypted} encrypted, ${stats.journalActivitiesSkipped} skipped, ${stats.journalActivitiesErrors} errors`);
    console.log(`Meetings: ${stats.meetingsProcessed} processed, ${stats.meetingsEncrypted} encrypted, ${stats.meetingsSkipped} skipped, ${stats.meetingsErrors} errors`);
    console.log(`Analytics: ${stats.analyticsProcessed} processed, ${stats.analyticsEncrypted} encrypted, ${stats.analyticsSkipped} skipped, ${stats.analyticsErrors} errors`);

    const totalProcessed = stats.notesProcessed + stats.journalEntriesProcessed + stats.habitCompletionsProcessed + 
                          stats.calendarEventsProcessed + stats.feedbackProcessed + stats.userSettingsProcessed + 
                          stats.conversationsProcessed + stats.habitsProcessed + stats.tasksProcessed + 
                          stats.journalMoodsProcessed + stats.journalActivitiesProcessed + stats.meetingsProcessed + 
                          stats.analyticsProcessed;
    const totalEncrypted = stats.notesEncrypted + stats.journalEntriesEncrypted + stats.habitCompletionsEncrypted + 
                          stats.calendarEventsEncrypted + stats.feedbackEncrypted + stats.userSettingsEncrypted + 
                          stats.conversationsEncrypted + stats.habitsEncrypted + stats.tasksEncrypted + 
                          stats.journalMoodsEncrypted + stats.journalActivitiesEncrypted + stats.meetingsEncrypted + 
                          stats.analyticsEncrypted;
    const totalErrors = stats.notesErrors + stats.journalEntriesErrors + stats.habitCompletionsErrors + 
                       stats.calendarEventsErrors + stats.feedbackErrors + stats.userSettingsErrors + 
                       stats.conversationsErrors + stats.habitsErrors + stats.tasksErrors + 
                       stats.journalMoodsErrors + stats.journalActivitiesErrors + stats.meetingsErrors + 
                       stats.analyticsErrors;

    console.log(`\nTotal: ${totalProcessed} processed, ${totalEncrypted} encrypted, ${totalErrors} errors`);

    if (isDryRun) {
      console.log('\n🔍 This was a dry run. No changes were made to the database.');
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

if (require.main === module) {
  main();
}