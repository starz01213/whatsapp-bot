#!/usr/bin/env node

/**
 * WhatsApp Linking Bot - API Test Suite
 * Tests all linking functionality
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:3000/api';
const TEST_PHONE = '+1234567890';

let sessionId = null;
let pin = null;
let testsPassed = 0;
let testsFailed = 0;

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = client.request(options, (res) => {
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function test(name, fn) {
  try {
    log(`\n🧪 ${name}...`, 'cyan');
    await fn();
    log(`✅ PASSED`, 'green');
    testsPassed++;
  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'red');
    testsFailed++;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🔐 WhatsApp Linking Bot - API Test Suite', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  // Test 1: Check server health
  await test('Server Health Check', async () => {
    const response = await makeRequest('GET', '/health');
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (!response.body.status) {
      throw new Error('Health check response missing status field');
    }
  });

  // Test 2: Generate linking session
  await test('Generate Linking Session', async () => {
    const response = await makeRequest('POST', '/linking/initiate', {
      phoneNumber: TEST_PHONE
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const { success, sessionId: sid, pin: p } = response.body;
    if (!success) throw new Error('Success flag is false');
    if (!sid) throw new Error('No sessionId in response');
    if (!p) throw new Error('No PIN in response');

    sessionId = sid;
    pin = p;

    log(`   Session ID: ${sessionId.substring(0, 16)}...`, 'yellow');
    log(`   PIN: ${pin}`, 'yellow');
  });

  // Test 3: Get session status
  await test('Get Session Status', async () => {
    if (!sessionId) throw new Error('No session ID from previous test');

    const response = await makeRequest('GET', `/linking/status/${sessionId}`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const { success, status } = response.body;
    if (!success) throw new Error('Success flag is false');
    if (status !== 'pending') {
      throw new Error(`Expected 'pending' status, got ${status}`);
    }
  });

  // Test 4: Get QR Code
  await test('Get QR Code', async () => {
    if (!sessionId) throw new Error('No session ID from previous test');

    const response = await makeRequest('GET', `/linking/qrcode/${sessionId}`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const { success, qrCode } = response.body;
    if (!success) throw new Error('Success flag is false');
    if (!qrCode || !qrCode.startsWith('data:image')) {
      throw new Error('Invalid QR code data');
    }

    log(`   QR Code generated (${qrCode.length} bytes)`, 'yellow');
  });

  // Test 5: Verify link with correct PIN
  await test('Verify Link with Correct PIN', async () => {
    if (!sessionId || !pin) {
      throw new Error('No session ID or PIN from previous tests');
    }

    const response = await makeRequest('POST', '/linking/verify', {
      sessionId: sessionId,
      pin: pin,
      phoneNumber: TEST_PHONE
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
    }

    const { success, message } = response.body;
    if (!success) throw new Error('Success flag is false');
    if (!message.includes('successfully linked')) {
      throw new Error(`Unexpected message: ${message}`);
    }
  });

  // Test 6: Get updated session status
  await test('Get Updated Session Status (Linked)', async () => {
    if (!sessionId) throw new Error('No session ID from previous test');

    const response = await makeRequest('GET', `/linking/status/${sessionId}`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const { success, status } = response.body;
    if (!success) throw new Error('Success flag is false');
    if (status !== 'linked') {
      throw new Error(`Expected 'linked' status, got ${status}`);
    }
  });

  // Test 7: Get linked accounts
  await test('Get Linked Accounts', async () => {
    const response = await makeRequest('GET', `/linking/accounts/${encodeURIComponent(TEST_PHONE)}`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const { success, linkedAccounts, totalLinked } = response.body;
    if (!success) throw new Error('Success flag is false');
    if (!Array.isArray(linkedAccounts)) throw new Error('linkedAccounts is not an array');
    if (totalLinked < 1) throw new Error('No linked accounts found');

    log(`   Total linked accounts: ${totalLinked}`, 'yellow');
  });

  // Test 8: Invalid PIN verification
  await test('Reject Verification with Invalid PIN', async () => {
    if (!sessionId) throw new Error('No session ID from previous test');

    const response = await makeRequest('POST', '/linking/verify', {
      sessionId: sessionId,
      pin: '00000000',
      phoneNumber: TEST_PHONE
    });

    // Should fail, so expect 500 or error response
    if (response.status === 200) {
      const { success } = response.body;
      if (success) throw new Error('Should have rejected invalid PIN');
    }
  });

  // Test 9: Test with invalid phone number
  await test('Reject Invalid Phone Number', async () => {
    const response = await makeRequest('POST', '/linking/initiate', {
      phoneNumber: 'invalid'
    });

    if (response.status === 200) {
      const { success } = response.body;
      if (success) throw new Error('Should have rejected invalid phone number');
    }
  });

  // Test 10: Test missing required fields
  await test('Reject Missing Phone Number', async () => {
    const response = await makeRequest('POST', '/linking/initiate', {});

    if (response.status === 200) {
      const { error } = response.body;
      if (!error) throw new Error('Should have rejected request');
    }
  });

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Test Summary', 'blue');
  log('='.repeat(60), 'blue');

  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  log(`Total Tests: ${total}`, 'cyan');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`Success Rate: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');

  log('\n' + '='.repeat(60) + '\n', 'blue');

  if (testsFailed === 0) {
    log('🎉 All tests passed!', 'green');
  } else {
    log(`⚠️  ${testsFailed} test(s) failed`, 'red');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Check if server is running
log('🔍 Checking server connection...', 'yellow');
makeRequest('GET', '/health')
  .then(() => {
    log('✅ Server is running\n', 'green');
    runTests().catch(error => {
      log(`\n❌ Test suite error: ${error.message}`, 'red');
      process.exit(1);
    });
  })
  .catch(error => {
    log('\n❌ Cannot connect to server', 'red');
    log(`Make sure the server is running at ${API_BASE}`, 'yellow');
    log('Start it with: npm start\n', 'yellow');
    process.exit(1);
  });
