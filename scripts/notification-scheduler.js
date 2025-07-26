#!/usr/bin/env node
// scripts/notification-scheduler.js
// Standalone notification scheduler for cron jobs

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY;

if (!API_KEY) {
  console.error('❌ INTERNAL_API_KEY environment variable is required');
  process.exit(1);
}

async function runScheduler() {
  try {
    console.log(`🔔 Running notification scheduler at ${new Date().toISOString()}`);
    
    const response = await fetch(`${BASE_URL}/api/notifications/scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Notification scheduler completed successfully');
    console.log('📊 Result:', result);
    
  } catch (error) {
    console.error('❌ Error running notification scheduler:', error.message);
    process.exit(1);
  }
}

// Run the scheduler
runScheduler();