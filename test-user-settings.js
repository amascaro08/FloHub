// Test script to verify user settings functionality
// Run with: node test-user-settings.js

const testUserSettings = async () => {
  console.log('🧪 Testing User Settings Functionality');
  
  // Test data
  const testSettings = {
    timezone: 'America/New_York',
    globalTags: ['work', 'personal', 'urgent'],
    floCatPersonality: ['humorous', 'helpful'],
    preferredName: 'Test User',
    tags: ['project-a', 'meeting'],
    calendarSources: [],
    activeWidgets: ['tasks', 'calendar'],
    floCatStyle: 'default',
    journalReminderEnabled: true,
    journalReminderTime: '20:00'
  };
  
  console.log('📝 Test settings:', testSettings);
  
  // Test encryption/decryption
  try {
    const { encryptUserSettingsFields, decryptUserSettingsFields } = require('./lib/contentSecurity');
    
    console.log('\n🔐 Testing encryption...');
    const encrypted = encryptUserSettingsFields(testSettings);
    console.log('Encrypted settings:', encrypted);
    
    console.log('\n🔓 Testing decryption...');
    const decrypted = decryptUserSettingsFields(encrypted);
    console.log('Decrypted settings:', decrypted);
    
    // Verify arrays are preserved
    console.log('\n✅ Verification:');
    console.log('Global tags preserved:', JSON.stringify(testSettings.globalTags) === JSON.stringify(decrypted.globalTags));
    console.log('FloCat personality preserved:', JSON.stringify(testSettings.floCatPersonality) === JSON.stringify(decrypted.floCatPersonality));
    console.log('Timezone preserved:', testSettings.timezone === decrypted.timezone);
    console.log('Preferred name preserved:', testSettings.preferredName === decrypted.preferredName);
    
  } catch (error) {
    console.error('❌ Error testing settings:', error);
  }
};

// Run the test
testUserSettings().catch(console.error);