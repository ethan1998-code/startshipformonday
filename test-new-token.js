const https = require('https');

// Simple test to create a Jira ticket
async function testNewJiraToken() {
  const JIRA_BASE_URL = 'https://ethanneuman4-1221.atlassian.net';
  const JIRA_PROJECT_KEY = 'AL';
  const JIRA_EMAIL = 'ethanneuman4@gmail.com';
  const NEW_JIRA_API_TOKEN = 'ATATT3xFfGF0_I3Il6iabyIG7oVUQzS1YxS1QQOux6HVnU6TdSS7AV-SMA_D3Paw8PpBybu_RpZsZgjfrpnCbU5kuRBa8bxuWDSFJPEEz6_Tthevl7T7h13Uxa5dkU6LHQ9p5ERGP035LGxTJEpEd_rVsJZIcWHmHOylRJhIPm1X-_eduJRf-RY=D0F2369E';
  
  const jiraAuth = Buffer.from(`${JIRA_EMAIL}:${NEW_JIRA_API_TOKEN}`).toString('base64');
  
  console.log('🎫 Testing new Jira token with minimal request...');
  console.log('Auth token length:', jiraAuth.length);
  
  const ticketData = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: 'Simple test ticket',
      description: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Simple test from Node.js' }]
        }]
      },
      issuetype: { name: 'Task' }
    }
  };
  
  const url = `${JIRA_BASE_URL}/rest/api/3/issue`;
  const data = JSON.stringify(ticketData);
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${jiraAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    console.log('🚀 Making simplified request...');
    
    const req = https.request(url, options, (res) => {
      console.log('Status:', res.statusCode);
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Response:', body);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ticket = JSON.parse(body);
          console.log('✅ SUCCESS! Ticket created:', ticket.key);
          resolve(ticket);
        } else {
          console.log('❌ FAILED:', body);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', error => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    // 5 second timeout
    req.setTimeout(5000, () => {
      console.error('❌ Timeout after 5 seconds');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.write(data);
    req.end();
  });
}

testNewJiraToken().then(() => {
  console.log('✅ New token test successful!');
}).catch(error => {
  console.error('❌ New token test failed:', error.message);
});
