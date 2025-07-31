// Vercel serverless function using Bolt HTTPReceiver
const { App, HTTPReceiver } = require('@slack/bolt');
const axios = require('axios');

// Create HTTP receiver for Vercel
const receiver = new HTTPReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Create Bolt app with HTTP receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
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

// Export the handler
export default receiver.requestHandler;
