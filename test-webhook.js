#!/usr/bin/env node

/**
 * Test script for GitHub webhook functionality
 * 
 * This script helps test the webhook endpoint to ensure it's working correctly
 * and to verify that the duplicate email and comment capture fixes are working.
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://flohub.vercel.app/api/github-webhook';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';

// Test data
const testIssueClosed = {
  action: "closed",
  issue: {
    number: 123,
    title: "Test Feedback Issue",
    state: "closed",
    html_url: "https://github.com/test/repo/issues/123"
  },
  comment: {
    id: 456,
    body: "This issue has been resolved. Thank you for your feedback!",
    user: {
      login: "developer"
    }
  }
};

const testIssueComment = {
  action: "created",
  issue: {
    number: 123,
    title: "Test Feedback Issue",
    state: "closed",
    html_url: "https://github.com/test/repo/issues/123"
  },
  comment: {
    id: 456,
    body: "Closing comment: This feature has been implemented successfully.",
    user: {
      login: "developer"
    }
  }
};

function createSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  return 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
}

function makeRequest(payload, eventType, signature) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': eventType,
        'X-Hub-Signature-256': signature,
        'X-GitHub-Delivery': 'test-delivery-id',
        'User-Agent': 'GitHub-Hookshot/test'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${responseData}`);
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testWebhook() {
  console.log('🧪 Testing GitHub Webhook Functionality\n');
  
  // Test 1: Issue closed event
  console.log('1. Testing issue closed event...');
  const signature1 = createSignature(testIssueClosed, WEBHOOK_SECRET);
  
  try {
    const result1 = await makeRequest(testIssueClosed, 'issues', signature1);
    console.log('✅ Issue closed test completed');
    console.log(`   Status: ${result1.statusCode}`);
    console.log(`   Response: ${result1.data}\n`);
  } catch (error) {
    console.error('❌ Issue closed test failed:', error.message);
  }

  // Test 2: Issue comment event
  console.log('2. Testing issue comment event...');
  const signature2 = createSignature(testIssueComment, WEBHOOK_SECRET);
  
  try {
    const result2 = await makeRequest(testIssueComment, 'issue_comment', signature2);
    console.log('✅ Issue comment test completed');
    console.log(`   Status: ${result2.statusCode}`);
    console.log(`   Response: ${result2.data}\n`);
  } catch (error) {
    console.error('❌ Issue comment test failed:', error.message);
  }

  // Test 3: Duplicate prevention
  console.log('3. Testing duplicate prevention...');
  try {
    const result3 = await makeRequest(testIssueClosed, 'issues', signature1);
    console.log('✅ Duplicate prevention test completed');
    console.log(`   Status: ${result3.statusCode}`);
    console.log(`   Response: ${result3.data}\n`);
  } catch (error) {
    console.error('❌ Duplicate prevention test failed:', error.message);
  }

  console.log('🎉 Webhook testing completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Check your application logs for webhook processing');
  console.log('2. Verify that only one email was sent');
  console.log('3. Check if the closing comment was captured');
  console.log('4. Verify the notificationSent flag in the database');
}

// Run the test
if (require.main === module) {
  testWebhook().catch(console.error);
}

module.exports = { testWebhook, makeRequest, createSignature };