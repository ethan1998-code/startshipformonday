#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration des tests
const BASE_URL = 'https://startship-pearl.vercel.app';
const ENDPOINTS = [
  {
    name: 'Homepage',
    path: '/',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Test Dashboard', 
    path: '/test',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Slack Events API (GET)',
    path: '/api/slack-events',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Slack Events API (POST Challenge)',
    path: '/api/slack-events',
    method: 'POST',
    expectedStatus: 200,
    body: JSON.stringify({ challenge: 'test_challenge_123' }),
    headers: { 'Content-Type': 'application/json' }
  },
  {
    name: 'Slack Install API',
    path: '/api/slack-install',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Slack OAuth Callback',
    path: '/api/slack-oauth-callback',
    method: 'GET',
    expectedStatus: 200
  }
];

// Fonction pour faire une requête HTTP
function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Fonction de test pour un endpoint
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const options = {
    method: endpoint.method,
    headers: endpoint.headers || {}
  };

  console.log(`🧪 Testing: ${endpoint.name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Method: ${endpoint.method}`);

  try {
    const result = await makeRequest(url, options, endpoint.body);
    
    const success = result.status === endpoint.expectedStatus;
    const statusIcon = success ? '✅' : '❌';
    
    console.log(`   ${statusIcon} Status: ${result.status} (expected: ${endpoint.expectedStatus})`);
    
    if (endpoint.name.includes('Challenge') && result.data) {
      const hasChallenge = result.data.challenge === 'test_challenge_123';
      console.log(`   ${hasChallenge ? '✅' : '❌'} Challenge response: ${hasChallenge ? 'OK' : 'FAIL'}`);
    }
    
    if (result.data && typeof result.data === 'object') {
      console.log(`   📄 Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
    }
    
    console.log('');
    return { success, status: result.status, data: result.data };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log('');
    return { success: false, error: error.message };
  }
}

// Fonction principale
async function runTests() {
  console.log('🚀 Starting Starship Slack Bot Tests');
  console.log('='.repeat(50));
  console.log('');

  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push({ ...endpoint, ...result });
  }

  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log('');

  if (passed === total) {
    console.log('🎉 All tests passed! Your Slack bot is ready to use.');
    console.log('');
    console.log('🔗 Slack Configuration URLs:');
    console.log(`   Event Subscriptions: ${BASE_URL}/api/slack-events`);
    console.log(`   Interactivity: ${BASE_URL}/api/slack-events`);
    console.log(`   OAuth Redirect: ${BASE_URL}/api/slack-oauth-callback`);
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

// Exécuter les tests
runTests().catch(console.error);
