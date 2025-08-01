// Test pour déterminer la localisation exacte des serveurs Vercel vs Jira
const https = require('https');

function testLatency(hostname, description) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.request({
      hostname: hostname,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 10000
    }, (res) => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`\n📍 ${description}:`);
      console.log(`   - Hostname: ${hostname}`);
      console.log(`   - Latency: ${latency}ms`);
      console.log(`   - Status: ${res.statusCode}`);
      
      // Check for geographic headers
      if (res.headers['cf-ray']) {
        console.log(`   - CloudFlare Ray: ${res.headers['cf-ray']}`);
      }
      if (res.headers['x-amz-cf-pop']) {
        console.log(`   - AWS CF Pop: ${res.headers['x-amz-cf-pop']}`);
      }
      if (res.headers['server-timing']) {
        console.log(`   - Server Timing: ${res.headers['server-timing']}`);
      }
      if (res.headers['via']) {
        console.log(`   - Via: ${res.headers['via']}`);
      }
      
      resolve({ hostname, latency, headers: res.headers });
    });
    
    req.on('error', (error) => {
      console.error(`❌ Error testing ${hostname}:`, error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.log(`⏰ Timeout testing ${hostname}`);
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function geoLocationTest() {
  console.log('🌍 Test de géolocalisation et latence...\n');
  
  const tests = [
    { 
      hostname: 'ethanneuman4-1221.atlassian.net', 
      description: 'Jira (Target)' 
    },
    { 
      hostname: 'google.com', 
      description: 'Google (Reference)' 
    },
    { 
      hostname: 'httpbin.org', 
      description: 'HTTPBin (Geographic test)' 
    },
    { 
      hostname: 'api.github.com', 
      description: 'GitHub API (Reference)' 
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await testLatency(test.hostname, test.description);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    } catch (error) {
      console.error(`Failed to test ${test.hostname}`);
    }
  }
  
  console.log('\n📊 RÉSUMÉ DES LATENCES:');
  console.log('========================');
  
  results.forEach(result => {
    let status = '✅';
    if (result.latency > 1000) status = '⚠️';
    if (result.latency > 3000) status = '❌';
    
    console.log(`${status} ${result.hostname}: ${result.latency}ms`);
  });
  
  const jiraResult = results.find(r => r.hostname.includes('atlassian'));
  if (jiraResult) {
    console.log('\n🎯 ANALYSE JIRA:');
    if (jiraResult.latency < 500) {
      console.log('✅ Excellente latence locale vers Jira');
    } else if (jiraResult.latency < 1500) {
      console.log('⚠️ Latence acceptable mais pourrait être problématique pour Vercel');
    } else {
      console.log('❌ Latence élevée - confirme le problème Vercel');
    }
  }
}

// Test de traceroute simulé
function testDNSAndRoute() {
  return new Promise((resolve, reject) => {
    const dns = require('dns');
    
    console.log('\n🔍 Test DNS et routing...');
    
    dns.lookup('ethanneuman4-1221.atlassian.net', (err, address, family) => {
      if (err) {
        console.error('❌ DNS lookup failed:', err);
        reject(err);
        return;
      }
      
      console.log(`📍 Jira IP: ${address} (IPv${family})`);
      
      // Determine rough geographic location based on IP
      const firstOctet = parseInt(address.split('.')[0]);
      
      let region = 'Unknown';
      if (firstOctet >= 3 && firstOctet <= 15) region = 'US East';
      else if (firstOctet >= 52 && firstOctet <= 54) region = 'EU/Europe';
      else if (firstOctet >= 13 && firstOctet <= 15) region = 'Asia Pacific';
      else if (firstOctet >= 18 && firstOctet <= 35) region = 'Global CDN';
      
      console.log(`🌍 Région estimée: ${region}`);
      
      resolve({ ip: address, region });
    });
  });
}

async function runAllTests() {
  console.log('🚀 Début des tests de géolocalisation...\n');
  
  try {
    // Test 1: Latency tests
    await geoLocationTest();
    
    // Test 2: DNS and routing
    await testDNSAndRoute();
    
    console.log('\n🎯 CONCLUSION:');
    console.log('==============');
    console.log('Si Jira latency < 1s en local = Jira est proche (Europe)');
    console.log('Si Vercel timeout 25s = Vercel est loin (USA probablement)');
    console.log('=> Solution: Régions EU sur Vercel ou changement hébergeur');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runAllTests();
