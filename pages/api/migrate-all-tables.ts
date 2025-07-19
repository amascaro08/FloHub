import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== MIGRATING ALL TABLES ===');
    
    const results = {
      tasks: { success: false, addedColumns: [] as string[], errors: [] as any[] },
      notes: { success: false, addedColumns: [] as string[], errors: [] as any[] },
      habits: { success: false, addedColumns: [] as string[], errors: [] as any[] },
      habitCompletions: { success: false, addedColumns: [] as string[], errors: [] as any[] }
    };
    
    // TASKS TABLE MIGRATION
    console.log('--- Migrating TASKS table ---');
    try {
      const tasksColumns = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'tasks' AND table_schema = 'public'
      `);
      
      const existingTasksColumns = new Set(tasksColumns.rows.map(r => r.column_name));
      console.log('Existing tasks columns:', Array.from(existingTasksColumns));
      
      const requiredTasksColumns = [
        { name: 'id', type: 'SERIAL PRIMARY KEY' },
        { name: 'user_email', type: 'VARCHAR(255) NOT NULL' },
        { name: 'text', type: 'TEXT NOT NULL' },
        { name: 'done', type: 'BOOLEAN DEFAULT false' },
        { name: 'due_date', type: 'TIMESTAMP' },
        { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' },
        { name: 'source', type: 'VARCHAR(50)' },
        { name: 'tags', type: 'JSONB' }
      ];
      
      for (const column of requiredTasksColumns) {
        if (!existingTasksColumns.has(column.name)) {
          try {
            await db.execute(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
            results.tasks.addedColumns.push(column.name);
            console.log(`✓ Added tasks.${column.name}`);
          } catch (error) {
            results.tasks.errors.push({ column: column.name, error: error instanceof Error ? error.message : 'Unknown' });
            console.error(`✗ Failed to add tasks.${column.name}:`, error);
          }
        }
      }
      results.tasks.success = true;
    } catch (error) {
      results.tasks.errors.push({ general: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // NOTES TABLE MIGRATION
    console.log('--- Migrating NOTES table ---');
    try {
      const notesColumns = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'notes' AND table_schema = 'public'
      `);
      
      const existingNotesColumns = new Set(notesColumns.rows.map(r => r.column_name));
      console.log('Existing notes columns:', Array.from(existingNotesColumns));
      
      const requiredNotesColumns = [
        { name: 'id', type: 'SERIAL PRIMARY KEY' },
        { name: 'user_email', type: 'VARCHAR(255) NOT NULL' },
        { name: 'title', type: 'VARCHAR(255)' },
        { name: 'content', type: 'TEXT NOT NULL' },
        { name: 'tags', type: 'TEXT[]' },
        { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' },
        { name: 'source', type: 'VARCHAR(50)' },
        { name: 'event_id', type: 'VARCHAR(255)' },
        { name: 'event_title', type: 'VARCHAR(255)' },
        { name: 'is_adhoc', type: 'BOOLEAN DEFAULT false' },
        { name: 'actions', type: 'JSONB' },
        { name: 'agenda', type: 'TEXT' },
        { name: 'ai_summary', type: 'TEXT' },
        { name: 'updatedAt', type: 'TIMESTAMP DEFAULT NOW()' }
      ];
      
      for (const column of requiredNotesColumns) {
        if (!existingNotesColumns.has(column.name)) {
          try {
            await db.execute(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
            results.notes.addedColumns.push(column.name);
            console.log(`✓ Added notes.${column.name}`);
          } catch (error) {
            results.notes.errors.push({ column: column.name, error: error instanceof Error ? error.message : 'Unknown' });
            console.error(`✗ Failed to add notes.${column.name}:`, error);
          }
        }
      }
      results.notes.success = true;
    } catch (error) {
      results.notes.errors.push({ general: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // HABITS TABLE MIGRATION
    console.log('--- Migrating HABITS table ---');
    try {
      // Check if habits table exists, create if not
      const habitsTableExists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'habits'
        );
      `);
      
      if (!habitsTableExists.rows[0]?.exists) {
        console.log('Creating habits table...');
        await db.execute(`
          CREATE TABLE IF NOT EXISTS habits (
            id SERIAL PRIMARY KEY,
            "userId" VARCHAR(255) NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            frequency TEXT NOT NULL,
            "customDays" JSONB,
            "createdAt" TIMESTAMP DEFAULT NOW(),
            "updatedAt" TIMESTAMP DEFAULT NOW()
          )
        `);
        results.habits.addedColumns.push('table_created');
      }
      results.habits.success = true;
    } catch (error) {
      results.habits.errors.push({ general: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // HABIT COMPLETIONS TABLE MIGRATION
    console.log('--- Migrating HABIT COMPLETIONS table ---');
    try {
      // Check if habitCompletions table exists, create if not
      const habitCompletionsExists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'habitCompletions'
        );
      `);
      
      if (!habitCompletionsExists.rows[0]?.exists) {
        console.log('Creating habitCompletions table...');
        await db.execute(`
          CREATE TABLE IF NOT EXISTS "habitCompletions" (
            id SERIAL PRIMARY KEY,
            "habitId" INTEGER NOT NULL,
            "userId" VARCHAR(255) NOT NULL,
            date TEXT NOT NULL,
            completed BOOLEAN DEFAULT false,
            notes TEXT,
            timestamp TIMESTAMP DEFAULT NOW()
          )
        `);
        results.habitCompletions.addedColumns.push('table_created');
      }
      results.habitCompletions.success = true;
    } catch (error) {
      results.habitCompletions.errors.push({ general: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // VERIFY FINAL STATE
    console.log('--- Verifying final state ---');
    const finalTasks = await db.execute(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND table_schema = 'public'`);
    const finalNotes = await db.execute(`SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' AND table_schema = 'public'`);
    const finalHabits = await db.execute(`SELECT column_name FROM information_schema.columns WHERE table_name = 'habits' AND table_schema = 'public'`);
    const finalHabitCompletions = await db.execute(`SELECT column_name FROM information_schema.columns WHERE table_name = 'habitCompletions' AND table_schema = 'public'`);
    
    return res.status(200).json({
      success: true,
      message: 'Database migration completed',
      results,
      finalState: {
        tasks: {
          columnCount: finalTasks.rows.length,
          columns: finalTasks.rows.map(r => r.column_name)
        },
        notes: {
          columnCount: finalNotes.rows.length, 
          columns: finalNotes.rows.map(r => r.column_name)
        },
        habits: {
          columnCount: finalHabits.rows.length,
          columns: finalHabits.rows.map(r => r.column_name)
        },
        habitCompletions: {
          columnCount: finalHabitCompletions.rows.length,
          columns: finalHabitCompletions.rows.map(r => r.column_name)
        }
      }
    });
    
  } catch (error) {
    console.error('=== MIGRATION ERROR ===', error);
    return res.status(500).json({ 
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}