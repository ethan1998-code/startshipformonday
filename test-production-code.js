// Test du code EXACT utilisé en production sur Vercel
const https = require('https');

// Copie exacte de la fonction makeHttpRequest de production
function makeHttpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    console.log('🌐 makeHttpRequest started');
    console.log('  - URL:', url);
    console.log('  - Method:', options.method);
    console.log('  - Headers:', JSON.stringify(options.headers, null, 2));
    console.log('  - Data length:', data ? data.length : 0);
    
    // Parse URL to get hostname and path
    const urlObj = new URL(url);
    
    // Optimize request options for better reliability
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers,
      // Add keep-alive and timeout optimizations
      agent: false, // Disable connection pooling for serverless
      timeout: 25000 // 25 second timeout
    };
    
    console.log('🔧 Request options:', JSON.stringify(requestOptions, null, 2));
    
    const req = https.request(requestOptions, (res) => {
      console.log('📡 Response received');
      console.log('  - Status code:', res.statusCode);
      console.log('  - Headers:', JSON.stringify(res.headers, null, 2));
      
      let body = '';
      res.on('data', chunk => {
        body += chunk;
        console.log('📦 Data chunk received, total length:', body.length);
      });
      
      res.on('end', () => {
        console.log('🏁 Response complete, body length:', body.length);
        console.log('📄 Response body:', body);
        
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Request successful');
            resolve(parsed);
          } else {
            console.log('❌ Request failed with status:', res.statusCode);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          console.error('❌ JSON parse error:', error.message);
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    // Set a 25 second timeout (maximum for Vercel serverless)
    req.setTimeout(25000, () => {
      console.error('❌ Request timeout (25s)');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      console.log('📤 Writing data to request...');
      req.write(data);
    }
    
    console.log('🚀 Ending request...');
    req.end();
  });
}

// Copie exacte de la fonction createJiraTicket de production
async function createJiraTicket(ticketData) {
  try {
    console.log('🎫 createJiraTicket started with data:', ticketData);
    
    // Check environment variables
    console.log('🔧 Environment check:');
    console.log('  - JIRA_BASE_URL:', process.env.JIRA_BASE_URL ? 'SET' : 'MISSING');
    console.log('  - JIRA_EMAIL:', process.env.JIRA_EMAIL ? 'SET' : 'MISSING');
    console.log('  - JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? 'SET' : 'MISSING');
    console.log('  - JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY ? 'SET' : 'MISSING');
    console.log('  - JIRA_ISSUE_TYPE:', process.env.JIRA_ISSUE_TYPE || 'Task (default)');
    
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN || !process.env.JIRA_PROJECT_KEY) {
      throw new Error('Missing required Jira environment variables');
    }
    
    console.log('🔧 Environment values:');
    console.log('  - JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
    console.log('  - JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY);
    
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    console.log('🔐 Jira auth token created (length:', jiraAuth.length, ')');
    
    const jiraPayload = {
      fields: {
        project: {
          key: process.env.JIRA_PROJECT_KEY
        },
        summary: ticketData.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description
                }
              ]
            }
          ]
        },
        issuetype: {
          name: process.env.JIRA_ISSUE_TYPE || 'Task'
        }
      }
    };
    
    console.log('📋 Jira payload prepared:', JSON.stringify(jiraPayload, null, 2));
    
    const data = JSON.stringify(jiraPayload);
    console.log('📤 JSON data length:', data.length);

    const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue`;
    console.log('🌐 Making request to:', url);

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log('📤 Request headers:', JSON.stringify(options.headers, null, 2));
    console.log('🚀 Calling makeHttpRequest...');

    const response = await makeHttpRequest(url, options, data);

    console.log('✅ Jira ticket created:', response);
    return response;
  } catch (error) {
    console.error('❌ Error creating Jira ticket:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

// Test avec les variables d'environnement
process.env.JIRA_BASE_URL = 'https://ethanneuman4-1221.atlassian.net';
process.env.JIRA_EMAIL = 'ethanneuman4@gmail.com';
process.env.JIRA_API_TOKEN = 'ATATT3xFfGF0_I3Il6iabyIG7oVUQzS1YxS1QQOux6HVnU6TdSS7AV-SMA_D3Paw8PpBybu_RpZsZgjfrpnCbU5kuRBa8bxuWDSFJPEEz6_Tthevl7T7h13Uxa5dkU6LHQ9p5ERGP035LGxTJEpEd_rVsJZIcWHmHOylRJhIPm1X-_eduJRf-RY=D0F2369E';
process.env.JIRA_PROJECT_KEY = 'AL';
process.env.JIRA_ISSUE_TYPE = 'Task';

async function testProductionCode() {
  console.log('🧪 Testing EXACT production code locally...');
  console.log('📅 Current time:', new Date().toISOString());
  
  const startTime = Date.now();
  
  try {
    const ticketData = {
      summary: 'Test production code local - ' + new Date().toLocaleTimeString(),
      description: 'Test du code exact de production en local pour diagnostiquer le problème Vercel'
    };
    
    const result = await createJiraTicket(ticketData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Test réussi en local !');
    console.log('⏱️ Durée totale:', duration, 'ms');
    console.log('🎫 Ticket créé:', result.key);
    
    if (duration > 10000) {
      console.log('⚠️ Attention: ça a pris plus de 10s même en local !');
    } else {
      console.log('✅ Timing normal en local (< 10s)');
    }
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Test échoué en local !');
    console.error('⏱️ Durée avant échec:', duration, 'ms');
    console.error('❌ Erreur:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('🤔 Même timeout en local - problème réseau ?');
    } else {
      console.log('🤔 Erreur différente du timeout Vercel');
    }
  }
}

console.log('🚀 Lancement du test...');
testProductionCode();
