import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== MIGRATING USER_SETTINGS TABLE ===');
    
    // Get current columns
    const currentColumns = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    console.log('Current columns:', currentColumns.rows.map(r => r.column_name));
    
    // Define all required columns with their types
    const requiredColumns = [
      { name: 'user_email', type: 'VARCHAR(255) PRIMARY KEY' },
      { name: 'flo_cat_style', type: 'VARCHAR(50) DEFAULT \'default\'' },
      { name: 'flo_cat_personality', type: 'TEXT[]' },
      { name: 'preferred_name', type: 'VARCHAR(255)' },
      { name: 'selected_cals', type: 'TEXT[]' },
      { name: 'default_view', type: 'VARCHAR(50)' },
      { name: 'custom_range', type: 'JSONB' },
      { name: 'power_automate_url', type: 'VARCHAR(255)' },
      { name: 'global_tags', type: 'TEXT[]' },
      { name: 'active_widgets', type: 'TEXT[]' },
      { name: 'calendar_sources', type: 'JSONB' },
      { name: 'timezone', type: 'VARCHAR(50)' },
      { name: 'tags', type: 'TEXT[]' },
      { name: 'widgets', type: 'TEXT[]' },
      { name: 'calendar_settings', type: 'JSONB' },
      { name: 'notification_settings', type: 'JSONB' },
      { name: 'flo_cat_settings', type: 'JSONB' },
      { name: 'layouts', type: 'JSONB' }
    ];
    
    const existingColumns = new Set(currentColumns.rows.map(r => r.column_name));
    const missingColumns = requiredColumns.filter(col => !existingColumns.has(col.name));
    
    console.log('Missing columns:', missingColumns.map(c => c.name));
    
    if (missingColumns.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All columns already exist',
        currentColumns: Array.from(existingColumns),
        missingColumns: []
      });
    }
    
    // Add missing columns one by one
    const addedColumns = [];
    const errors = [];
    
    for (const column of missingColumns) {
      try {
        console.log(`Adding column: ${column.name} ${column.type}`);
        await db.execute(`
          ALTER TABLE user_settings 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        addedColumns.push(column.name);
        console.log(`✓ Added: ${column.name}`);
      } catch (error) {
        console.error(`✗ Failed to add ${column.name}:`, error);
        errors.push({
          column: column.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Verify final state
    const finalColumns = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    console.log('Final columns:', finalColumns.rows.map(r => r.column_name));
    
    return res.status(200).json({
      success: true,
      message: 'Migration completed',
      addedColumns,
      errors,
      finalColumnCount: finalColumns.rows.length,
      finalColumns: finalColumns.rows.map(r => r.column_name)
    });
    
  } catch (error) {
    console.error('=== MIGRATION ERROR ===', error);
    return res.status(500).json({ 
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}