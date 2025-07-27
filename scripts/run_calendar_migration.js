#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Helper function for node-postgres migration
async function tryNodePostgresMigration(databaseUrl, migrationSQL) {
  try {
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    console.log('🔌 Connected to database');
    
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully using node-postgres!');
    
    await client.end();
    
  } catch (pgError) {
    console.error('❌ Failed to run migration with node-postgres:', pgError);
    throw pgError;
  }
}

// Main migration function
async function runMigration() {
  console.log('🗄️  Running calendar events table migration...');

  try {
  // Read the migration SQL file
  const migrationPath = path.join(__dirname, 'migrate_calendar_events.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Migration SQL loaded successfully');
  
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('🔗 Database URL found');
  
  // Create a temporary SQL file
  const tempSqlFile = path.join(__dirname, 'temp_migration.sql');
  fs.writeFileSync(tempSqlFile, migrationSQL);
  
  console.log('🚀 Executing migration...');
  
  // Run the migration using psql
  try {
    execSync(`psql "${databaseUrl}" -f "${tempSqlFile}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log('✅ Migration completed successfully!');
    
    // Clean up temporary file
    fs.unlinkSync(tempSqlFile);
    
  } catch (psqlError) {
    console.log('📦 psql not found, trying alternative method...');
    
    // Alternative: Use node-postgres if psql is not available
    await tryNodePostgresMigration(databaseUrl, migrationSQL);
    
    // Clean up temporary file
    fs.unlinkSync(tempSqlFile);
  }
  
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('🎉 Calendar events table migration completed!');
  console.log('📝 Local FloHub calendar is now ready to use.');
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});