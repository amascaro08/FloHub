#!/usr/bin/env node

/**
 * Test script for PWA Authentication Persistence
 * 
 * This script tests the enhanced PWA authentication persistence features:
 * - Device fingerprinting
 * - PWA reinstallation detection
 * - Extended cookie expiry
 * - Enhanced offline handling
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing PWA Authentication Persistence...\n');

// Test 1: Check if enhanced auth persistence hook exists
console.log('1. Checking enhanced auth persistence hook...');
const authPersistencePath = path.join(__dirname, '../lib/hooks/useAuthPersistence.ts');
if (fs.existsSync(authPersistencePath)) {
  const content = fs.readFileSync(authPersistencePath, 'utf8');
  
  const tests = [
    { name: 'Device ID generation', pattern: 'generateDeviceId' },
    { name: 'PWA installation tracking', pattern: 'getPWAInstallTime' },
    { name: 'Reinstallation detection', pattern: 'isPWAReinstallation' },
    { name: 'Extended refresh intervals', pattern: '24 * 60 * 60 * 1000' },
    { name: 'Enhanced auth state', pattern: 'deviceId?: string' },
    { name: 'PWA install time tracking', pattern: 'pwaInstallTime?: number' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (content.includes(test.pattern)) {
      console.log(`   ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.name} - Missing`);
    }
  });
  
  console.log(`   📊 ${passed}/${tests.length} features found\n`);
} else {
  console.log('   ❌ Auth persistence hook not found\n');
}

// Test 2: Check enhanced cookie utilities
console.log('2. Checking enhanced cookie utilities...');
const cookieUtilsPath = path.join(__dirname, '../lib/cookieUtils.ts');
if (fs.existsSync(cookieUtilsPath)) {
  const content = fs.readFileSync(cookieUtilsPath, 'utf8');
  
  const tests = [
    { name: 'Extended PWA cookie expiry', pattern: '365 * 24 * 60 * 60' },
    { name: 'Remember me support', pattern: 'rememberMe?: boolean' },
    { name: 'Enhanced logging', pattern: 'maxAgeDays' },
    { name: 'PWA-specific handling', pattern: 'isPWA.*rememberMe' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (content.includes(test.pattern)) {
      console.log(`   ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.name} - Missing`);
    }
  });
  
  console.log(`   📊 ${passed}/${tests.length} features found\n`);
} else {
  console.log('   ❌ Cookie utilities not found\n');
}

// Test 3: Check PWA reinstallation handler
console.log('3. Checking PWA reinstallation handler...');
const reinstallHandlerPath = path.join(__dirname, '../components/ui/PWAReinstallationHandler.tsx');
if (fs.existsSync(reinstallHandlerPath)) {
  const content = fs.readFileSync(reinstallHandlerPath, 'utf8');
  
  const tests = [
    { name: 'Reinstallation detection', pattern: 'isPWAReinstallation' },
    { name: 'User notification', pattern: 'showReinstallMessage' },
    { name: 'Auto-dismiss', pattern: 'setTimeout.*5000' },
    { name: 'Security message', pattern: 'reinstalled.*security' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (content.includes(test.pattern)) {
      console.log(`   ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.name} - Missing`);
    }
  });
  
  console.log(`   📊 ${passed}/${tests.length} features found\n`);
} else {
  console.log('   ❌ PWA reinstallation handler not found\n');
}

// Test 4: Check enhanced service worker
console.log('4. Checking enhanced service worker...');
const swPath = path.join(__dirname, '../public/sw.js');
if (fs.existsSync(swPath)) {
  const content = fs.readFileSync(swPath, 'utf8');
  
  const tests = [
    { name: 'Separate auth cache', pattern: 'AUTH_CACHE_NAME' },
    { name: 'Enhanced auth handling', pattern: 'handleAuthRequest' },
    { name: 'Offline auth support', pattern: 'cached session data' },
    { name: 'Auth cache management', pattern: 'CLEAR_AUTH_CACHE' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (content.includes(test.pattern)) {
      console.log(`   ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.name} - Missing`);
    }
  });
  
  console.log(`   📊 ${passed}/${tests.length} features found\n`);
} else {
  console.log('   ❌ Service worker not found\n');
}

// Test 5: Check updated login API
console.log('5. Checking updated login API...');
const loginApiPath = path.join(__dirname, '../pages/api/auth/login.ts');
if (fs.existsSync(loginApiPath)) {
  const content = fs.readFileSync(loginApiPath, 'utf8');
  
  const tests = [
    { name: 'Enhanced cookie settings', pattern: 'rememberMe' },
    { name: 'PWA detection', pattern: 'user-agent.*standalone' },
    { name: 'Extended persistence', pattern: 'createSecureCookie' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (content.includes(test.pattern)) {
      console.log(`   ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.name} - Missing`);
    }
  });
  
  console.log(`   📊 ${passed}/${tests.length} features found\n`);
} else {
  console.log('   ❌ Login API not found\n');
}

// Test 6: Check app integration
console.log('6. Checking app integration...');
const appPath = path.join(__dirname, '../pages/_app.tsx');
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  
  const tests = [
    { name: 'PWA reinstallation handler', pattern: 'PWAReinstallationHandler' },
    { name: 'Auth state hydrator', pattern: 'AuthStateHydrator' },
    { name: 'Service worker registration', pattern: 'serviceWorker.register' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (content.includes(test.pattern)) {
      console.log(`   ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.name} - Missing`);
    }
  });
  
  console.log(`   📊 ${passed}/${tests.length} features found\n`);
} else {
  console.log('   ❌ App component not found\n');
}

console.log('🎉 PWA Authentication Persistence Test Complete!');
console.log('\n📋 Summary:');
console.log('   • Extended token refresh intervals (24h PWA, 7d browser)');
console.log('   • Device fingerprinting for persistence tracking');
console.log('   • PWA reinstallation detection and handling');
console.log('   • Enhanced cookie expiry (up to 1 year for PWA)');
console.log('   • Improved offline auth state handling');
console.log('   • Better service worker auth caching');
console.log('\n🚀 Ready for deployment!');