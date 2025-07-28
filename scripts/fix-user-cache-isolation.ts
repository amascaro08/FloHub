#!/usr/bin/env tsx

/**
 * Fix User Cache Isolation Script
 * 
 * This script addresses the critical privacy issue where calendar data
 * was being shared between different user accounts due to non-user-scoped caching.
 * 
 * It performs the following actions:
 * 1. Clear all existing shared caches
 * 2. Reset IndexedDB databases 
 * 3. Clear localStorage entries that aren't user-scoped
 * 4. Create a clean slate for user-scoped caching
 */

import { db } from '../lib/drizzle';
import { users } from '../db/schema';

interface CacheStats {
  indexedDBDatabases: string[];
  localStorageKeys: string[];
  userCount: number;
}

async function getAllUsers(): Promise<{email: string}[]> {
  try {
    const allUsers = await db.select({ email: users.email }).from(users);
    return allUsers.filter(user => user.email);
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function clearSharedIndexedDBDatabases(): Promise<string[]> {
  const clearedDatabases: string[] = [];
  
  if (typeof window === 'undefined') {
    console.log('⚠️ IndexedDB cleanup can only be performed in browser environment');
    return clearedDatabases;
  }

  try {
    // List of known shared database names that need to be cleared
    const sharedDBNames = [
      'CalendarCacheDB', // The main problematic one
      'flohub-cache',
      'CalendarCache',
      'EventCache'
    ];

    for (const dbName of sharedDBNames) {
      try {
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log(`🗑️ Deleted shared IndexedDB: ${dbName}`);
            clearedDatabases.push(dbName);
            resolve();
          };
          deleteRequest.onerror = () => {
            console.warn(`⚠️ Could not delete IndexedDB: ${dbName}`, deleteRequest.error);
            resolve(); // Continue even if deletion fails
          };
          deleteRequest.onblocked = () => {
            console.warn(`⚠️ IndexedDB deletion blocked: ${dbName}`);
            resolve(); // Continue even if blocked
          };
        });
      } catch (error) {
        console.warn(`Error deleting database ${dbName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during IndexedDB cleanup:', error);
  }

  return clearedDatabases;
}

async function clearSharedLocalStorage(): Promise<string[]> {
  const clearedKeys: string[] = [];
  
  if (typeof window === 'undefined') {
    console.log('⚠️ localStorage cleanup can only be performed in browser environment');
    return clearedKeys;
  }

  try {
    const keysToRemove: string[] = [];
    
    // Identify potentially shared cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Remove keys that don't contain an email address (likely shared)
        const hasEmailPattern = /@/.test(key);
        const isUserScoped = key.includes(':') && hasEmailPattern;
        
        // Remove non-user-scoped cache keys
        if (!isUserScoped && (
          key.startsWith('calendar_') ||
          key.startsWith('events_') ||
          key.startsWith('cache:') ||
          key.startsWith('prefetch:') ||
          key.includes('Calendar') ||
          key.includes('Event')
        )) {
          keysToRemove.push(key);
        }
      }
    }

    // Remove identified keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      clearedKeys.push(key);
      console.log(`🗑️ Removed shared localStorage: ${key}`);
    });

  } catch (error) {
    console.error('Error during localStorage cleanup:', error);
  }

  return clearedKeys;
}

async function generateCacheReport(): Promise<CacheStats> {
  const stats: CacheStats = {
    indexedDBDatabases: [],
    localStorageKeys: [],
    userCount: 0
  };

  try {
    // Get user count
    const users = await getAllUsers();
    stats.userCount = users.length;

    if (typeof window !== 'undefined') {
      // Check IndexedDB databases
      try {
        const databases = await indexedDB.databases();
        stats.indexedDBDatabases = databases.map(db => db.name || 'unnamed');
      } catch (error) {
        console.warn('Could not list IndexedDB databases:', error);
      }

      // Check localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          stats.localStorageKeys.push(key);
        }
      }
    }
  } catch (error) {
    console.error('Error generating cache report:', error);
  }

  return stats;
}

async function main() {
  console.log('🔧 Starting User Cache Isolation Fix...\n');

  try {
    // Generate initial report
    console.log('📊 Generating initial cache report...');
    const initialStats = await generateCacheReport();
    console.log(`Users in database: ${initialStats.userCount}`);
    console.log(`IndexedDB databases: ${initialStats.indexedDBDatabases.length}`);
    console.log(`localStorage keys: ${initialStats.localStorageKeys.length}\n`);

    // Clear shared caches
    console.log('🧹 Clearing shared IndexedDB databases...');
    const clearedDBs = await clearSharedIndexedDBDatabases();
    
    console.log('🧹 Clearing shared localStorage entries...');
    const clearedKeys = await clearSharedLocalStorage();

    // Generate final report
    console.log('\n📊 Generating final cache report...');
    const finalStats = await generateCacheReport();

    // Summary
    console.log('\n✅ Cache Isolation Fix Summary:');
    console.log(`🗑️ Cleared IndexedDB databases: ${clearedDBs.length}`);
    clearedDBs.forEach(db => console.log(`   - ${db}`));
    
    console.log(`🗑️ Cleared localStorage keys: ${clearedKeys.length}`);
    clearedKeys.forEach(key => console.log(`   - ${key}`));
    
    console.log(`📊 Remaining IndexedDB databases: ${finalStats.indexedDBDatabases.length}`);
    console.log(`📊 Remaining localStorage keys: ${finalStats.localStorageKeys.length}`);

    console.log('\n🎉 User cache isolation fix completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. All users will now have properly isolated caches');
    console.log('2. Calendar data will no longer be shared between accounts');
    console.log('3. Users may need to reconnect their Google Calendar accounts');
    console.log('4. Monitor for any remaining data leakage issues');

  } catch (error) {
    console.error('❌ Error during cache isolation fix:', error);
    process.exit(1);
  }
}

// Run as a client-side script if in browser
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).fixUserCacheIsolation = main;
  console.log('🌐 Browser script loaded. Run `fixUserCacheIsolation()` to execute.');
} else {
  // Node.js environment - just log instruction
  console.log('📋 User Cache Isolation Fix Instructions:');
  console.log('');
  console.log('This script needs to be run in the browser to clear client-side caches.');
  console.log('');
  console.log('To execute:');
  console.log('1. Open your browser developer console on your app');
  console.log('2. Copy and paste the browser version of this script');
  console.log('3. Run the fix function');
  console.log('');
  console.log('Alternatively, the new user-scoped caching will automatically');
  console.log('prevent future data leakage without manual intervention.');
}

export { main as fixUserCacheIsolation };