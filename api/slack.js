// Direct Slack command handler without Bolt framework
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// Make HTTP request using native Node.js modules
function makeHttpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Simple Jira ticket creation function
async function createJiraTicket(ticketData) {
  try {
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    const data = JSON.stringify({
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
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const response = await makeHttpRequest(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
      options,
      data
    );

    console.log('✅ Jira ticket created:', response);
    return response;
  } catch (error) {
    console.error('❌ Error creating Jira ticket:', error.message);
    throw error;
  }
}

// Send response back to Slack
async function sendSlackResponse(responseUrl, message) {
  try {
    const data = JSON.stringify(message);
    const url = new URL(responseUrl);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    await makeHttpRequest(responseUrl, options, data);
    console.log('✅ Response sent to Slack');
  } catch (error) {
    console.error('❌ Error sending response to Slack:', error.message);
  }
}

// Handle /ticket command
async function handleTicketCommand(commandData) {
  try {
    console.log('🎫 Processing /ticket command:', commandData.text);
    
    const ticketData = {
      summary: commandData.text || 'Nouveau ticket créé depuis Slack',
      description: `Ticket créé par ${commandData.user_name} (@${commandData.user_id}) depuis Slack\n\nDescription: ${commandData.text || 'Aucune description fournie'}`,
      assigneeAccountId: null
    };

    const ticket = await createJiraTicket(ticketData);
    
    if (ticket && ticket.key) {
      const jiraUrl = `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`;
      
      const response = {
        response_type: 'in_channel',
        text: `✅ Ticket Jira créé avec succès !`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Ticket Jira créé avec succès !*\n\n*Ticket:* <${jiraUrl}|${ticket.key}>\n*Titre:* ${ticketData.summary}\n*Créé par:* <@${commandData.user_id}>`
            }
          }
        ]
      };

      await sendSlackResponse(commandData.response_url, response);
      console.log('✅ Ticket created successfully:', ticket.key);
      
      return { statusCode: 200, body: '' };
    } else {
      throw new Error('Failed to create ticket - no ticket key returned');
    }
  } catch (error) {
    console.error('❌ Error creating Jira ticket:', error);
    
    const errorResponse = {
      response_type: 'ephemeral',
      text: `❌ Erreur lors de la création du ticket Jira: ${error.message}`
    };
    
    await sendSlackResponse(commandData.response_url, errorResponse);
    return { statusCode: 200, body: '' };
  }
}

// Slack signature verification
function verifySlackSignature(signingSecret, timestamp, rawBody, signature) {
  const baseString = 'v0:' + timestamp + ':' + rawBody;
  const expectedSignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(baseString, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}

// Get raw body from request
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

// Disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
}

// Main handler function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📥 Incoming request from:', req.headers['user-agent']);
    
    // Get raw body
    const rawBody = await getRawBody(req);
    console.log('📥 Raw body:', rawBody);
    
    // Verify Slack signature
    const timestamp = req.headers['x-slack-request-timestamp'];
    const signature = req.headers['x-slack-signature'];
    
    if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET, timestamp, rawBody, signature)) {
      console.error('❌ Invalid Slack signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('✅ Slack signature verified');

    // Handle URL verification challenge
    if (rawBody.includes('"type":"url_verification"')) {
      const bodyObj = JSON.parse(rawBody);
      if (bodyObj.type === 'url_verification') {
        console.log('📋 URL verification challenge');
        return res.status(200).json({ challenge: bodyObj.challenge });
      }
    }

    // Parse form data for slash commands
    const formData = querystring.parse(rawBody);
    console.log('📋 Parsed form data:', formData);

    // Handle /ticket command
    if (formData.command === '/ticket') {
      console.log('🎫 /ticket command detected');
      
      // Send immediate acknowledgment
      res.status(200).send('');
      
      // Process command asynchronously
      setTimeout(async () => {
        await handleTicketCommand(formData);
      }, 100);
      
      return;
    }

    // Handle other events (app_home_opened, etc.)
    if (rawBody.includes('"type":"event_callback"')) {
      console.log('📨 Event callback received');
      return res.status(200).send('OK');
    }

    console.log('❓ Unknown request type');
    return res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error in handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
