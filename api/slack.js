// Main Vercel serverless function - handles all Slack requests
const { App } = require('@slack/bolt');

// Create a new Bolt app instance for HTTP mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Import Jira client
const axios = require('axios');

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
      assigneeAccountId: null // Pas d'assigné par défaut
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
    const result = await client.chat.postMessage({
      channel: event.user,
      text: `👋 Bienvenue dans Starship ! 

Je suis votre assistant pour créer des tickets Jira rapidement.

🎯 **Comment utiliser Starship :**
• Utilisez la commande \`/ticket\` pour créer un nouveau ticket Jira
• Suivez les instructions pour remplir les détails

🔗 **Autorisation Jira requise :**
Pour pouvoir créer des tickets, vous devez d'abord autoriser l'accès à votre compte Jira.`,
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
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔗 *Autorisation Jira requise :*\nPour pouvoir créer des tickets, vous devez d'abord autoriser l'accès à votre compte Jira.`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔑 Autoriser Jira'
            },
            url: `${process.env.NEXTAUTH_URL || 'https://startship-pearl.vercel.app'}/api/jira/auth`,
            action_id: 'authorize_jira'
          }
        }
      ]
    });
    console.log('✅ Onboarding message sent to user:', event.user);
  } catch (error) {
    console.error('❌ Error sending onboarding message:', error);
  }
});

// Disable body parsing for raw access
export const config = {
  api: {
    bodyParser: false,
  },
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body data
    const rawBody = await getRawBody(req);
    console.log('🔍 [DEBUG] Raw body length:', rawBody.length);
    console.log('🔍 [DEBUG] Raw body first 200 chars:', rawBody.substring(0, 200));
    console.log('🔍 [DEBUG] Content-Type:', req.headers['content-type']);
    console.log('🔍 [DEBUG] User-Agent:', req.headers['user-agent']);

    // Handle Slack URL verification challenge
    if (rawBody.includes('"type":"url_verification"')) {
      const bodyObj = JSON.parse(rawBody);
      if (bodyObj.type === 'url_verification') {
        console.log('📋 Slack URL verification challenge received');
        return res.status(200).json({ challenge: bodyObj.challenge });
      }
    }

    console.log('📤 Sending to Bolt processEvent');

    const boltResponse = await app.processEvent({
      body: rawBody,
      headers: req.headers,
      isBase64Encoded: false
    });

    console.log('✅ Bolt response received:', boltResponse ? 'Success' : 'No response');

    // Handle the response
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
    console.error('❌ Error in Slack handler:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
