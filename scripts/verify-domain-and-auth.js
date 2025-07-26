#!/usr/bin/env node

/**
 * Domain and Authentication Verification Script
 * Tests domain accessibility and authentication configuration
 */

const https = require('https');
const { URL } = require('url');

const domains = [
  'https://flohub.xyz',
  'https://www.flohub.xyz',
  'https://flohub.vercel.app'
];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'HEAD',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      resolve({
        url,
        status: res.statusCode,
        headers: res.headers,
        location: res.headers.location
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        error: error.message,
        status: 'ERROR'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        error: 'Request timeout',
        status: 'TIMEOUT'
      });
    });

    req.end();
  });
}

async function testDomains() {
  log('blue', '🔍 Testing Domain Accessibility...\n');
  
  for (const domain of domains) {
    try {
      const result = await makeRequest(domain);
      
      if (result.error) {
        log('red', `❌ ${domain}: ${result.error}`);
      } else {
        const status = result.status;
        const statusColor = status === 200 ? 'green' : 
                           status >= 300 && status < 400 ? 'yellow' : 'red';
        
        log(statusColor, `${status === 200 ? '✅' : status >= 300 && status < 400 ? '🔄' : '❌'} ${domain}: ${status}`);
        
        if (result.location) {
          log('yellow', `   → Redirects to: ${result.location}`);
        }
        
        if (result.headers.server) {
          log('blue', `   → Server: ${result.headers.server}`);
        }
      }
    } catch (error) {
      log('red', `❌ ${domain}: ${error.message}`);
    }
    console.log();
  }
}

async function testAuthEndpoints() {
  log('blue', '🔐 Testing Authentication Endpoints...\n');
  
  const authEndpoints = [
    '/api/auth/session',
    '/api/auth/callback/google-additional',
    '/api/debug-status',
    '/api/debug/cookie-test?action=info'
  ];
  
  for (const endpoint of authEndpoints) {
    try {
      const url = `https://www.flohub.xyz${endpoint}`;
      const result = await makeRequest(url);
      
      if (result.error) {
        log('red', `❌ ${endpoint}: ${result.error}`);
      } else {
        const statusColor = result.status === 200 ? 'green' : 
                           result.status === 401 ? 'yellow' : 
                           result.status === 403 ? 'yellow' : 'red';
        log(statusColor, `${result.status === 200 ? '✅' : result.status === 401 || result.status === 403 ? '🔐' : '❌'} ${endpoint}: ${result.status}`);
      }
    } catch (error) {
      log('red', `❌ ${endpoint}: ${error.message}`);
    }
  }
}

function checkEnvironmentVariables() {
  log('blue', '\n🔧 Environment Variables Check...\n');
  
  const requiredVars = [
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      log('green', `✅ ${varName}: Set (${varName === 'NEXTAUTH_URL' ? value : '***'})`);
    } else {
      log('red', `❌ ${varName}: Not set`);
    }
  });
}

function showRecommendations() {
  log('blue', '\n💡 Recommendations:\n');
  
  console.log('1. Multi-domain cookie support is now active:');
  console.log('   → Cookies automatically work for flohub.xyz and www.flohub.xyz');
  console.log('   → Vercel domain (flohub.vercel.app) has independent cookies');
  console.log();
  
  console.log('2. Choose your primary domain strategy:');
  console.log('   → Option A: Keep current redirect (flohub.xyz → www.flohub.xyz)');
  console.log('   → Option B: Make flohub.xyz primary (configure in Vercel)');
  console.log();
  
  console.log('3. Update environment variables:');
  console.log('   → Set NEXTAUTH_URL to match your serving domain');
  console.log('   → Update Google OAuth redirect URI accordingly');
  console.log();
  
  console.log('4. Test multi-domain authentication:');
  console.log('   → Login on one domain, verify it works on related domains');
  console.log('   → Check browser dev tools for proper cookie domain settings');
  console.log('   → Use /api/debug/cookie-test for detailed domain info');
}

async function main() {
  console.log('🚀 FloHub Domain & Authentication Verification\n');
  
  await testDomains();
  await testAuthEndpoints();
  checkEnvironmentVariables();
  showRecommendations();
  
  log('green', '\n✨ Verification complete!');
}

if (require.main === module) {
  main().catch(console.error);
}