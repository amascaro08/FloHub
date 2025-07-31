#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate a new version based on timestamp
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `v${year}.${month}.${day}.${hour}${minute}`;
}

// Update the service worker file with new version
function updateServiceWorkerVersion() {
  const swPath = path.join(__dirname, '../public/sw.js');
  
  if (!fs.existsSync(swPath)) {
    console.error('Service worker file not found:', swPath);
    process.exit(1);
  }
  
  const newVersion = generateVersion();
  console.log('Updating PWA version to:', newVersion);
  
  let content = fs.readFileSync(swPath, 'utf8');
  
  // Update the version line
  const versionRegex = /const CACHE_VERSION = ['"`]v[\d.]+['"`];/;
  const newVersionLine = `const CACHE_VERSION = '${newVersion}';`;
  
  if (versionRegex.test(content)) {
    content = content.replace(versionRegex, newVersionLine);
  } else {
    console.error('Could not find CACHE_VERSION in service worker file');
    process.exit(1);
  }
  
  fs.writeFileSync(swPath, content, 'utf8');
  console.log('✅ Service worker version updated successfully');
  
  // Also update the manifest version if it exists
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.version = newVersion;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✅ Manifest version updated successfully');
    } catch (error) {
      console.warn('⚠️ Could not update manifest version:', error.message);
    }
  }
}

// Run the update
updateServiceWorkerVersion();