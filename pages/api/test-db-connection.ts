import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== DATABASE CONNECTION TEST ===');
    
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    console.log('1. NEON_DATABASE_URL exists:', !!process.env.NEON_DATABASE_URL);
    console.log('1. NEON_DATABASE_URL prefix:', process.env.NEON_DATABASE_URL?.substring(0, 30));
    
    // Test 2: Simple query
    console.log('2. Testing simple query...');
    const simpleResult = await db.execute('SELECT 1 as test_value');
    console.log('2. Simple query success:', simpleResult);
    
    // Test 3: Check if tables exist
    console.log('3. Testing table existence...');
    const tablesResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_settings', 'tasks')
      ORDER BY table_name
    `);
    console.log('3. Tables found:', tablesResult.rows);
    
    // Test 4: Check user_settings table structure
    console.log('4. Testing user_settings table structure...');
    const columnsResult = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    console.log('4. user_settings columns:', columnsResult.rows);
    
    // Test 5: Check if the specific user exists in user_settings
    console.log('5. Testing user_settings data...');
    const userSettingsCount = await db.execute(`
      SELECT COUNT(*) as count 
      FROM user_settings 
      WHERE user_email = 'amascaro08@gmail.com'
    `);
    console.log('5. User settings count:', userSettingsCount.rows);
    
    // Test 6: Try to create a user_settings record if it doesn't exist
    console.log('6. Checking if user_settings record needs to be created...');
    if (userSettingsCount.rows[0]?.count === '0') {
      console.log('6. Creating default user_settings record...');
      const insertResult = await db.execute(`
        INSERT INTO user_settings (user_email, flo_cat_style, active_widgets) 
        VALUES ('amascaro08@gmail.com', 'default', ARRAY['tasks', 'calendar'])
        ON CONFLICT (user_email) DO NOTHING
      `);
      console.log('6. Insert result:', insertResult);
    }
    
    return res.status(200).json({
      success: true,
      tests: {
        connection: 'SUCCESS',
        simpleQuery: 'SUCCESS',
        tablesExist: tablesResult.rows.length,
        userSettingsColumns: columnsResult.rows.length,
        userSettingsRecordExists: userSettingsCount.rows[0]?.count !== '0'
      },
      data: {
        tables: tablesResult.rows,
        columns: columnsResult.rows,
        userSettingsCount: userSettingsCount.rows[0]?.count
      },
      environment: {
        hasNeonUrl: !!process.env.NEON_DATABASE_URL,
        neonUrlLength: process.env.NEON_DATABASE_URL?.length || 0
      }
    });
    
  } catch (error) {
    console.error('=== DATABASE CONNECTION ERROR ===', error);
    
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    };
    
    return res.status(500).json({ 
      error: 'Database connection failed',
      details: errorDetails,
      environment: {
        hasNeonUrl: !!process.env.NEON_DATABASE_URL,
        neonUrlLength: process.env.NEON_DATABASE_URL?.length || 0,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
}