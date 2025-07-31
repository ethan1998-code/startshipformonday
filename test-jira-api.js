const https = require('https');

// Test Jira ticket creation in existing project AL
async function testJiraTicketCreation() {
  const JIRA_BASE_URL = 'https://ethanneuman4-1221.atlassian.net';
  const JIRA_PROJECT_KEY = 'AL';
  const JIRA_EMAIL = 'ethanneuman4@gmail.com';
  const JIRA_API_TOKEN = 'ATATT3xFfGF0_I3Il6iabyIG7oVUQzS1YxS1QQOux6HVnU6TdSS7AV-SMA_D3Paw8PpBybu_RpZsZgjfrpnCbU5kuRBa8bxuWDSFJPEEz6_Tthevl7T7h13Uxa5dkU6LHQ9p5ERGP035LGxTJEpEd_rVsJZIcWHmHOylRJhIPm1X-_eduJRf-RY=D0F2369E';
  
  const jiraAuth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  
  console.log('🎫 Testing Jira ticket creation with new token...');
  console.log('Base URL:', JIRA_BASE_URL);
  console.log('Project Key:', JIRA_PROJECT_KEY);
  console.log('Auth token length:', jiraAuth.length);
  
  // Create a ticket
  const testUrl = `${JIRA_BASE_URL}/rest/api/3/issue`;
  
  const ticketData = {
    fields: {
      project: {
        key: JIRA_PROJECT_KEY
      },
      summary: 'Test ticket from API with new token',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is a test ticket created via API with the new token'
              }
            ]
          }
        ]
      },
      issuetype: {
        name: 'Task'
      }
    }
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${jiraAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    console.log('🚀 Making request...');
    
    const req = https.request(testUrl, options, (res) => {
      console.log('📡 Response received, status:', res.statusCode);
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('📄 Response body:', body);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ticket = JSON.parse(body);
          console.log('✅ Ticket created successfully!');
          console.log('   - Key:', ticket.key);
          console.log('   - ID:', ticket.id);
          console.log('   - Self:', ticket.self);
          resolve(ticket);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      console.error('❌ Request timeout (15s)');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    const jsonData = JSON.stringify(ticketData);
    console.log('📤 Sending data:', jsonData);
    req.write(jsonData);
    req.end();
  });
}

testJiraTicketCreation().then(() => {
  console.log('✅ Jira ticket creation test successful');
}).catch(error => {
  console.error('❌ Jira ticket creation test failed:', error.message);
});
