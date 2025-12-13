/**
 * WhatsApp Bot API Test Suite
 * 
 * Run this file to test all API endpoints
 * Usage: node test-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const ADMIN_PASSWORD = 'your_admin_password'; // Change this to match your .env

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ADMIN_PASSWORD}`
};

// Helper function for making requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: headers,
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
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

// Test functions
const tests = {
  // Health check
  async healthCheck() {
    console.log('\n📋 Testing Health Check...');
    const res = await makeRequest('GET', '/health');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200;
  },

  // Commodity tests
  async addCommodity() {
    console.log('\n📦 Testing Add Commodity...');
    const data = {
      name: 'Test Rice',
      price: 19.99,
      description: 'Test commodity for testing',
      category: 'Grains'
    };
    const res = await makeRequest('POST', '/api/commodities', data);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200 && res.data.commodity;
  },

  async getCommodities() {
    console.log('\n📦 Testing Get Commodities...');
    const res = await makeRequest('GET', '/api/commodities');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${res.data.commodities?.length || 0} commodities`);
    return res.statusCode === 200;
  },

  async searchCommodities() {
    console.log('\n📦 Testing Search Commodities...');
    const res = await makeRequest('GET', '/api/commodities/search/rice');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${res.data.results?.length || 0} results`);
    return res.statusCode === 200;
  },

  // Bulk messaging tests
  async sendBulkMessage() {
    console.log('\n📧 Testing Send Bulk Message...');
    const data = {
      message: '🎉 Test message to all users from API test',
      imageUrl: null
    };
    const res = await makeRequest('POST', '/api/bulk-message', data);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200;
  },

  async getBulkMessages() {
    console.log('\n📧 Testing Get Bulk Messages...');
    const res = await makeRequest('GET', '/api/bulk-messages');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${res.data.messages?.length || 0} bulk messages`);
    return res.statusCode === 200;
  },

  // Update tests
  async broadcastUpdate() {
    console.log('\n📢 Testing Broadcast Update...');
    const data = {
      title: 'API Test Update',
      description: 'This is a test update from the API',
      imageUrl: null,
      version: '1.0.0'
    };
    const res = await makeRequest('POST', '/api/broadcast-update', data);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200;
  },

  async getUpdates() {
    console.log('\n📢 Testing Get Updates...');
    const res = await makeRequest('GET', '/api/updates');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${res.data.updates?.length || 0} updates`);
    return res.statusCode === 200;
  },

  // Subscription tests
  async getSubscriptionStats() {
    console.log('\n📅 Testing Get Subscription Stats...');
    const res = await makeRequest('GET', '/api/subscriptions/stats');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200;
  },

  async getAllSubscriptions() {
    console.log('\n📅 Testing Get All Subscriptions...');
    const res = await makeRequest('GET', '/api/subscriptions');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${res.data.subscriptions?.length || 0} subscriptions`);
    return res.statusCode === 200;
  },

  async checkExpiredSubscriptions() {
    console.log('\n📅 Testing Check Expired Subscriptions...');
    const res = await makeRequest('POST', '/api/subscriptions/check-expiry');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200;
  },

  async sendRenewalReminders() {
    console.log('\n📅 Testing Send Renewal Reminders...');
    const res = await makeRequest('POST', '/api/subscriptions/send-reminders');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, res.data);
    return res.statusCode === 200;
  },
};

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting WhatsApp Bot API Tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('=' .repeat(50));

  const results = {};

  for (const [testName, testFunc] of Object.entries(tests)) {
    try {
      results[testName] = await testFunc();
      console.log(`✅ ${testName}: PASSED`);
    } catch (error) {
      console.log(`❌ ${testName}: FAILED`);
      console.error(`Error: ${error.message}`);
      results[testName] = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed. Please check the errors above.`);
  }
}

// Run tests
runAllTests().catch(console.error);
