#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test the PWA update system
function testPWAUpdate() {
  console.log('🧪 Testing PWA Update System...\n');

  // Test 1: Check if service worker file exists
  const swPath = path.join(__dirname, '../public/sw.js');
  if (!fs.existsSync(swPath)) {
    console.error('❌ Service worker file not found');
    return false;
  }
  console.log('✅ Service worker file exists');

  // Test 2: Check if manifest file exists
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifest file not found');
    return false;
  }
  console.log('✅ Manifest file exists');

  // Test 3: Check if update script exists
  const updateScriptPath = path.join(__dirname, 'update-pwa-version.js');
  if (!fs.existsSync(updateScriptPath)) {
    console.error('❌ Update script not found');
    return false;
  }
  console.log('✅ Update script exists');

  // Test 4: Check if PWA components exist
  const pwaComponents = [
    '../components/ui/PWAUpdateManager.tsx',
    '../hooks/usePWAUpdate.ts'
  ];

  for (const component of pwaComponents) {
    const componentPath = path.join(__dirname, component);
    if (!fs.existsSync(componentPath)) {
      console.error(`❌ PWA component not found: ${component}`);
      return false;
    }
    console.log(`✅ PWA component exists: ${component}`);
  }

  // Test 5: Check service worker version format
  const swContent = fs.readFileSync(swPath, 'utf8');
  const versionMatch = swContent.match(/const CACHE_VERSION = ['"`](v[\d.]+)['"`];/);
  if (!versionMatch) {
    console.error('❌ Service worker version not found');
    return false;
  }
  console.log(`✅ Service worker version: ${versionMatch[1]}`);

  // Test 6: Check manifest version
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  if (!manifest.version) {
    console.error('❌ Manifest version not found');
    return false;
  }
  console.log(`✅ Manifest version: ${manifest.version}`);

  // Test 7: Verify versions match
  if (versionMatch[1] !== manifest.version) {
    console.error('❌ Service worker and manifest versions do not match');
    return false;
  }
  console.log('✅ Service worker and manifest versions match');

  console.log('\n🎉 All PWA update system tests passed!');
  console.log('\n📋 System Components:');
  console.log('  • Service Worker: /public/sw.js');
  console.log('  • Manifest: /public/manifest.json');
  console.log('  • Update Manager: /components/ui/PWAUpdateManager.tsx');
  console.log('  • Update Hook: /hooks/usePWAUpdate.ts');
  console.log('  • Update Script: /scripts/update-pwa-version.js');
  console.log('  • Deployment Script: /scripts/deploy-pwa.sh');
  
  console.log('\n🚀 To deploy with PWA updates:');
  console.log('  npm run build:pwa');
  console.log('  # or');
  console.log('  ./scripts/deploy-pwa.sh');

  return true;
}

// Run the test
testPWAUpdate();