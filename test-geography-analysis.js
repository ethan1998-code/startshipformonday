// Test pour identifier l'emplacement exact des serveurs Vercel
const https = require('https');

function checkVercelRegion() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Test de la région Vercel actuelle...\n');
    
    // Test d'une fonction Vercel publique pour voir leur région
    const req = https.request({
      hostname: 'vercel.com',
      port: 443,
      path: '/api/hello',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log('📍 Vercel response headers:');
      
      Object.keys(res.headers).forEach(key => {
        if (key.includes('region') || 
            key.includes('location') || 
            key.includes('server') ||
            key.includes('cf-') ||
            key.includes('x-') ||
            key.includes('via')) {
          console.log(`   ${key}: ${res.headers[key]}`);
        }
      });
      
      // Check for specific geographic indicators
      const serverHeader = res.headers['server'] || '';
      const xCacheHeader = res.headers['x-cache'] || '';
      const viaHeader = res.headers['via'] || '';
      const cfRay = res.headers['cf-ray'] || '';
      
      console.log('\n🌍 Analyse géographique:');
      
      if (cfRay) {
        // CloudFlare ray ID can indicate data center
        const datacenter = cfRay.split('-')[1] || 'unknown';
        console.log(`   CloudFlare DC: ${datacenter}`);
      }
      
      if (viaHeader.includes('cloudfront')) {
        console.log('   ✅ Amazon CloudFront détecté');
      }
      
      resolve(res.headers);
    });
    
    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏰ Timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

// Test de latence vers différentes régions AWS pour comparaison
async function testAWSRegionsLatency() {
  console.log('\n🌐 Test de latence vers différentes régions AWS...\n');
  
  const regions = [
    { name: 'us-east-1', endpoint: 'dynamodb.us-east-1.amazonaws.com' },
    { name: 'us-west-2', endpoint: 'dynamodb.us-west-2.amazonaws.com' },
    { name: 'eu-west-1', endpoint: 'dynamodb.eu-west-1.amazonaws.com' },
    { name: 'eu-central-1', endpoint: 'dynamodb.eu-central-1.amazonaws.com' },
    { name: 'ap-southeast-1', endpoint: 'dynamodb.ap-southeast-1.amazonaws.com' }
  ];
  
  for (const region of regions) {
    try {
      const startTime = Date.now();
      
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: region.endpoint,
          port: 443,
          path: '/',
          method: 'HEAD',
          timeout: 3000
        }, (res) => {
          const latency = Date.now() - startTime;
          
          let status = '✅';
          if (latency > 500) status = '⚠️';
          if (latency > 1000) status = '❌';
          
          console.log(`${status} ${region.name}: ${latency}ms`);
          resolve();
        });
        
        req.on('error', () => {
          console.log(`❌ ${region.name}: Connection failed`);
          resolve();
        });
        
        req.setTimeout(3000, () => {
          console.log(`⏰ ${region.name}: Timeout`);
          req.destroy();
          resolve();
        });
        
        req.end();
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`❌ ${region.name}: Error`);
    }
  }
}

async function analyzeGeography() {
  console.log('🌍 ANALYSE GÉOGRAPHIQUE COMPLÈTE');
  console.log('=================================\n');
  
  try {
    // Test Vercel
    await checkVercelRegion();
    
    // Test AWS regions
    await testAWSRegionsLatency();
    
    console.log('\n🎯 RECOMMANDATION:');
    console.log('==================');
    console.log('1. Si eu-west-1/eu-central-1 ont la meilleure latence');
    console.log('   => Configurer Vercel region EU');
    console.log('2. Si us-east-1 a la meilleure latence'); 
    console.log('   => Confirme que Vercel est aux USA');
    console.log('   => Problème de distance géographique confirmé');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

analyzeGeography();
