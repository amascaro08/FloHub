const https = require('https');
const http = require('http');

// Test the user settings API
async function testUserSettings() {
  console.log('Testing user settings API...');
  
  // Test GET request
  try {
    const getResponse = await makeRequest('GET', '/api/userSettings');
    console.log('GET Response:', getResponse);
  } catch (error) {
    console.error('GET Error:', error.message);
  }
  
  // Test PUT request with some settings
  try {
    const testSettings = {
      selectedCals: ["primary"],
      defaultView: "month",
      globalTags: ["test-tag"],
      activeWidgets: ["tasks", "calendar"],
      timezone: "UTC",
      sidebarPreferences: {
        visiblePages: ["Hub", "Tasks", "Calendar"],
        order: ["Hub", "Tasks", "Calendar"],
        collapsed: false
      }
    };
    
    const putResponse = await makeRequest('PUT', '/api/userSettings', testSettings);
    console.log('PUT Response:', putResponse);
  } catch (error) {
    console.error('PUT Error:', error.message);
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

// Run the test
testUserSettings().catch(console.error);