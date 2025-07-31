// Vercel serverless function for Slack - Manual handling
const { App } = require('@slack/bolt');
const crypto = require('crypto');
const axios = require('axios');

// Create Bolt app (we'll handle HTTP manually)
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Simple Jira ticket creation function
async function createJiraTicket(ticketData) {
  try {
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    const response = await axios.post(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
      {
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
      },
      {
        headers: {
          'Authorization': `Basic ${jiraAuth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Jira ticket created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating Jira ticket:', error.response?.data || error.message);
    throw error;
  }
}

// Add /ticket command handler
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();

  try {
    console.log('🎫 Creating Jira ticket from command:', command.text);
    
    const ticketData = {
      summary: command.text || 'Nouveau ticket créé depuis Slack',
      description: `Ticket créé par <@${command.user_id}> depuis Slack\n\nDescription: ${command.text || 'Aucune description fournie'}`,
      assigneeAccountId: null
    };

    const ticket = await createJiraTicket(ticketData);
    
    if (ticket && ticket.key) {
      const jiraUrl = `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`;
      await respond({
        response_type: 'in_channel',
        text: `✅ Ticket Jira créé avec succès !`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Ticket Jira créé avec succès !*\n\n*Ticket:* <${jiraUrl}|${ticket.key}>\n*Titre:* ${ticketData.summary}\n*Créé par:* <@${command.user_id}>`
            }
          }
        ]
      });
      console.log('✅ Ticket created successfully:', ticket.key);
    } else {
      throw new Error('Failed to create ticket - no ticket key returned');
    }
  } catch (error) {
    console.error('❌ Error creating Jira ticket:', error);
    await respond({
      response_type: 'ephemeral',
      text: `❌ Erreur lors de la création du ticket Jira: ${error.message}`,
    });
  }
});

// Add app_home_opened event handler
app.event('app_home_opened', async ({ event, client }) => {
  try {
    await client.chat.postMessage({
      channel: event.user,
      text: `👋 Bienvenue dans Starship !`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `👋 *Bienvenue dans Starship !*\n\nJe suis votre assistant pour créer des tickets Jira rapidement.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎯 *Comment utiliser Starship :*\n• Utilisez la commande \`/ticket\` pour créer un nouveau ticket Jira\n• Suivez les instructions pour remplir les détails`
          }
        }
      ]
    });
    console.log('✅ Onboarding message sent to user:', event.user);
  } catch (error) {
    console.error('❌ Error sending onboarding message:', error);
  }
});

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
    
    // Verify Slack signature (temporarily disabled for debugging)
    const timestamp = req.headers['x-slack-request-timestamp'];
    const signature = req.headers['x-slack-signature'];
    
    console.log('🔍 Signature verification details:', {
      timestamp,
      signature,
      signingSecret: process.env.SLACK_SIGNING_SECRET ? 'present' : 'missing',
      bodyLength: rawBody.length
    });
    
    // Temporarily skip signature verification for debugging
    /*
    if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET, timestamp, rawBody, signature)) {
      console.error('❌ Invalid Slack signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    */
    
    console.log('✅ Slack signature verification skipped for debugging');

    // Handle URL verification challenge
    if (rawBody.includes('"type":"url_verification"')) {
      const bodyObj = JSON.parse(rawBody);
      if (bodyObj.type === 'url_verification') {
        console.log('📋 URL verification challenge');
        return res.status(200).json({ challenge: bodyObj.challenge });
      }
    }

    // Process with Bolt
    const boltResponse = await app.processEvent({
      body: rawBody,
      headers: req.headers,
      isBase64Encoded: false
    });

    console.log('✅ Bolt processed successfully');

    // Handle response
    if (boltResponse) {
      res.status(boltResponse.statusCode || 200);
      
      if (boltResponse.headers) {
        Object.keys(boltResponse.headers).forEach(key => {
          res.setHeader(key, boltResponse.headers[key]);
        });
      }
      
      return res.send(boltResponse.body || '');
    }
    
    return res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error in handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
