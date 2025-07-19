import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== FIXING NOTES COLUMN CASE ===');
    
    // Check current column name
    const currentColumns = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notes' 
      AND table_schema = 'public' 
      AND column_name IN ('updatedat', 'updatedAt')
    `);
    
    console.log('Current timestamp columns:', currentColumns.rows);
    
    // If we have updatedat (lowercase), rename it to updatedAt (camelCase)
    const hasLowercase = currentColumns.rows.some(r => r.column_name === 'updatedat');
    const hasCamelCase = currentColumns.rows.some(r => r.column_name === 'updatedAt');
    
    if (hasLowercase && !hasCamelCase) {
      console.log('Renaming updatedat to updatedAt...');
      await db.execute(`ALTER TABLE notes RENAME COLUMN updatedat TO "updatedAt"`);
      console.log('✓ Column renamed successfully');
    } else if (hasCamelCase) {
      console.log('✓ updatedAt column already exists with correct case');
    } else {
      console.log('Adding updatedAt column...');
      await db.execute(`ALTER TABLE notes ADD COLUMN "updatedAt" TIMESTAMP DEFAULT NOW()`);
      console.log('✓ updatedAt column added');
    }
    
    // Verify final state
    const finalColumns = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notes' 
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    return res.status(200).json({
      success: true,
      message: 'Notes column case fixed',
      hadLowercase: hasLowercase,
      hasCamelCase: hasCamelCase,
      finalColumns: finalColumns.rows.map(r => r.column_name)
    });
    
  } catch (error) {
    console.error('=== NOTES COLUMN FIX ERROR ===', error);
    return res.status(500).json({ 
      error: 'Failed to fix notes column',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}