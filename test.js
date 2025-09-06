// Simple test file for AeNKI Auth
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: process.env.PORT || 8005,
  adminToken: process.env.AE_NKI_ADMIN_TOKEN || 'admin-boot-key-ONLY-server-side'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
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
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await makeRequest({
      hostname: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: '/health',
      method: 'GET'
    });
    
    if (response.status === 200) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Service: ${response.data.service}`);
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testIssueApiKey() {
  console.log('🔐 Testing API key issuance...');
  try {
    const response = await makeRequest({
      hostname: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: '/auth/issue',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': TEST_CONFIG.adminToken
      }
    }, {
      client_id: 'test-client',
      scopes: ['read', 'write']
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ API key issued successfully');
      console.log(`   Client ID: ${response.data.client_id}`);
      console.log(`   API Key: ${response.data.api_key.substring(0, 20)}...`);
      return response.data.api_key;
    } else {
      console.log('❌ API key issuance failed');
      console.log('   Response:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ API key issuance error:', error.message);
    return null;
  }
}

async function testSecureEndpoint(apiKey) {
  console.log('🔒 Testing secure endpoint...');
  try {
    const response = await makeRequest({
      hostname: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: '/secure/echo?msg=test-message',
      method: 'GET',
      headers: {
        'x-aenki-key': apiKey
      }
    });

    if (response.status === 200 && response.data.valid) {
      console.log('✅ Secure endpoint test passed');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Client: ${response.data.who}`);
      return true;
    } else {
      console.log('❌ Secure endpoint test failed');
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Secure endpoint test error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting AeNKI Auth Tests');
  console.log('================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Health Check
  total++;
  if (await testHealthCheck()) {
    passed++;
  }
  console.log('');

  // Test 2: Issue API Key
  total++;
  const apiKey = await testIssueApiKey();
  if (apiKey) {
    passed++;
  }
  console.log('');

  // Test 3: Secure Endpoint (only if we have an API key)
  if (apiKey) {
    total++;
    if (await testSecureEndpoint(apiKey)) {
      passed++;
    }
    console.log('');
  }

  // Results
  console.log('================================');
  console.log(`🏁 Tests completed: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! AeNKI Auth is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the server and configuration.');
    process.exit(1);
  }
}

// Check if server is running first
console.log('🔍 Checking if AeNKI Auth server is running...');
console.log(`Host: ${TEST_CONFIG.host}:${TEST_CONFIG.port}`);
console.log('');

// Run tests
runTests().catch((error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
