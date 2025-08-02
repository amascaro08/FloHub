const https = require('https');
const http = require('http');

// Test all the user settings that need to work
async function testAllUserSettings() {
  console.log('🧪 Testing comprehensive user settings...');
  
  // Test settings that need to work
  const testSettings = {
    // Global tags
    globalTags: ["work", "personal", "urgent"],
    
    // Timezone
    timezone: "America/New_York",
    
    // FloCat preferences
    floCatStyle: "more_catty",
    floCatPersonality: ["friendly", "helpful", "enthusiastic"],
    preferredName: "Alex",
    
    // 24 hour view (this might be in calendar settings)
    calendarSettings: {
      calendars: [],
      use24HourFormat: true
    },
    
    // Calendar sources
    calendarSources: [
      {
        id: "google-1",
        name: "Work Calendar",
        type: "google",
        sourceId: "work@company.com",
        tags: ["work"],
        isEnabled: true
      },
      {
        id: "ical-1", 
        name: "Personal Calendar",
        type: "ical",
        sourceId: "https://example.com/calendar.ics",
        tags: ["personal"],
        isEnabled: true
      }
    ],
    
    // Theme preference
    theme: "dark",
    
    // Other important settings
    selectedCals: ["primary", "google-1", "ical-1"],
    defaultView: "week",
    activeWidgets: ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
    hiddenWidgets: [],
    
    // Sidebar preferences
    sidebarPreferences: {
      visiblePages: ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
      order: ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
      collapsed: false
    },
    
    // Journal settings
    journalReminderEnabled: true,
    journalReminderTime: "21:00",
    journalPinProtection: true,
    journalExportFormat: "json",
    journalAutoSave: true,
    journalDailyPrompts: true,
    journalMoodTracking: true,
    journalActivityTracking: true,
    journalSleepTracking: true,
    journalWeeklyReflections: true,
    journalCustomActivities: [
      { name: "Exercise", icon: "🏃‍♂️" },
      { name: "Reading", icon: "📚" }
    ],
    journalDisabledActivities: ["sleep"],
    
    // Notes settings
    notesGrouping: "week",
    defaultCalendarView: "week"
  };
  
  console.log('📝 Test settings to save:', JSON.stringify(testSettings, null, 2));
  
  // Test PUT request to save settings
  try {
    console.log('\n💾 Saving settings...');
    const putResponse = await makeRequest('PUT', '/api/userSettings', testSettings);
    console.log('✅ PUT Response:', putResponse);
    
    // Verify the saved settings
    console.log('\n🔍 Verifying saved settings...');
    const getResponse = await makeRequest('GET', '/api/userSettings');
    console.log('✅ GET Response:', getResponse);
    
    // Check if all settings were saved correctly
    const verificationChecks = [
      { field: 'globalTags', expected: testSettings.globalTags },
      { field: 'timezone', expected: testSettings.timezone },
      { field: 'floCatStyle', expected: testSettings.floCatStyle },
      { field: 'floCatPersonality', expected: testSettings.floCatPersonality },
      { field: 'preferredName', expected: testSettings.preferredName },
      { field: 'theme', expected: testSettings.theme },
      { field: 'calendarSources', expected: testSettings.calendarSources },
      { field: 'selectedCals', expected: testSettings.selectedCals },
      { field: 'defaultView', expected: testSettings.defaultView },
      { field: 'sidebarPreferences', expected: testSettings.sidebarPreferences },
      { field: 'journalReminderEnabled', expected: testSettings.journalReminderEnabled },
      { field: 'journalCustomActivities', expected: testSettings.journalCustomActivities },
      { field: 'notesGrouping', expected: testSettings.notesGrouping },
      { field: 'defaultCalendarView', expected: testSettings.defaultCalendarView }
    ];
    
    console.log('\n🔍 Verification Results:');
    verificationChecks.forEach(check => {
      const actual = getResponse[check.field];
      const matches = JSON.stringify(actual) === JSON.stringify(check.expected);
      console.log(`${matches ? '✅' : '❌'} ${check.field}: ${matches ? 'PASS' : 'FAIL'}`);
      if (!matches) {
        console.log(`   Expected: ${JSON.stringify(check.expected)}`);
        console.log(`   Actual: ${JSON.stringify(actual)}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth=test-token' // You'll need to replace this with a real auth token
      }
    };

    const req = (process.env.NODE_ENV === 'production' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Run the comprehensive test
testAllUserSettings().catch(console.error);