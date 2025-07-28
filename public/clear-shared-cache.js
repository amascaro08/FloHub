/**
 * Emergency Cache Cleanup Script
 * 
 * This script clears shared caches that may contain data from other users.
 * Run this in your browser console if you're seeing calendar data from other accounts.
 * 
 * Instructions:
 * 1. Open Developer Tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

(function() {
  console.log('🧹 Starting emergency cache cleanup...');
  
  let clearedCount = 0;
  
  try {
    // 1. Clear potentially shared localStorage entries
    console.log('🗑️ Clearing localStorage...');
    const localKeysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('calendar_') ||
        key.startsWith('events_') ||
        key.startsWith('cache:') ||
        key.startsWith('prefetch:') ||
        key.includes('Calendar') ||
        key.includes('Event') ||
        (key.includes('cache') && !key.includes('@')) // Non-user-scoped cache
      )) {
        localKeysToRemove.push(key);
      }
    }
    
    localKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
      clearedCount++;
      console.log(`   Removed: ${key}`);
    });
    
    // 2. Clear potentially shared sessionStorage entries
    console.log('🗑️ Clearing sessionStorage...');
    const sessionKeysToRemove = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('calendar') ||
        key.includes('events') ||
        key.includes('cache')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      clearedCount++;
      console.log(`   Removed: ${key}`);
    });
    
    // 3. Clear shared IndexedDB databases
    console.log('🗑️ Clearing shared IndexedDB databases...');
    const sharedDBNames = [
      'CalendarCacheDB', // The main problematic one
      'flohub-cache',
      'CalendarCache',
      'EventCache'
    ];
    
    const deletePromises = sharedDBNames.map(dbName => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
          console.log(`   Deleted IndexedDB: ${dbName}`);
          clearedCount++;
          resolve();
        };
        deleteRequest.onerror = () => {
          console.warn(`   Could not delete IndexedDB: ${dbName}`);
          resolve();
        };
        deleteRequest.onblocked = () => {
          console.warn(`   IndexedDB deletion blocked: ${dbName}`);
          resolve();
        };
      });
    });
    
    Promise.all(deletePromises).then(() => {
      console.log(`✅ Emergency cache cleanup completed!`);
      console.log(`🗑️ Cleared ${clearedCount} cache entries`);
      console.log('');
      console.log('📝 Next steps:');
      console.log('1. Refresh this page');
      console.log('2. Log out and log back in');
      console.log('3. Reconnect your Google Calendar if needed');
      console.log('');
      console.log('🔒 Your data is now properly isolated from other users.');
    });
    
  } catch (error) {
    console.error('❌ Error during cache cleanup:', error);
    console.log('📞 If you continue to see issues, please contact support.');
  }
})();

console.log('📋 Emergency cache cleanup script loaded. It will run automatically.');
console.log('🔄 If you need to run it again, refresh this page and run the script again.');