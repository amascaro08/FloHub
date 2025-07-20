#!/usr/bin/env node

// Load environment variables from .env.local if it exists
try {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  console.log('Could not load .env.local file:', error.message);
}

// Simple script to check authentication configuration
console.log('🔍 Checking authentication configuration...\n');

// Check if JWT_SECRET is set
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.log('❌ JWT_SECRET is not set');
  console.log('   This is likely the cause of the authentication issues.');
  console.log('   Please set JWT_SECRET in your environment variables.');
} else {
  console.log('✅ JWT_SECRET is set');
  console.log(`   Length: ${jwtSecret.length} characters`);
}

// Check other important environment variables
const requiredEnvVars = [
  'NEON_DATABASE_URL',
  'NODE_ENV'
];

console.log('\n📋 Environment Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName} is set`);
  } else {
    console.log(`❌ ${varName} is not set`);
  }
});

console.log('\n🔧 To fix authentication issues:');
console.log('1. Set JWT_SECRET environment variable');
console.log('2. Ensure NEON_DATABASE_URL is set');
console.log('3. Restart your application');

console.log('\n💡 Example JWT_SECRET generation:');
console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');