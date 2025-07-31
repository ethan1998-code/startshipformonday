const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

console.log('🚀 Environment variables test:');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✓ Defined' : '✗ Missing');
console.log('SLACK_APP_TOKEN:', 'Not needed in HTTP mode');
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✓ Defined' : '✗ Missing');
console.log('JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY || 'Not defined');

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
  console.error('❌ Missing environment variables for HTTP mode!');
  process.exit(1);
}

console.log('✅ All variables are defined!');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false, // HTTP mode for Vercel
  processBeforeResponse: true
});

// Mémoire temporaire pour thread Slack <-> clé Jira
const threadToJiraKey = {};

// Stockage des utilisateurs qui ont déjà reçu le message d'onboarding
const onboardedUsers = new Set();

// Crée un ticket Jira
async function createJiraTicket(summary, description) {
  try {
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    // Structure de base du ticket
    const issueData = {
      fields: {
        project: { key: process.env.JIRA_PROJECT_KEY || 'AL' },
        summary: summary,
        issuetype: { name: process.env.JIRA_ISSUE_TYPE || 'Task' }
      }
    };

    // Ajouter la description seulement si elle existe et n'est pas vide
    if (description && description.trim()) {
      issueData.fields.description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: description }
            ]
          }
        ]
      };
    }
    
    const response = await axios.post(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
      issueData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    return response.data.key;
  } catch (error) {
    console.error("Jira Error:", error.response ? error.response.data : error.message);
    return null;
  }
}

// Handler pour /ticket
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();
  console.log('📝 Ticket command received:', command.text);
  
  await respond({
    text: command.thread_ts ? "Creating ticket from thread..." : "Creating ticket...",
    response_type: "ephemeral"
  });

  const summary = command.text || "New ticket from Slack";
  // No automatic description - title only is sufficient
  const jiraKey = await createJiraTicket(summary, "");

  if (jiraKey) {
    if (command.thread_ts) {
      threadToJiraKey[command.thread_ts] = jiraKey;
    } else {
      threadToJiraKey[command.ts] = jiraKey;
    }
    await respond(`:white_check_mark: Jira ticket created: <${process.env.JIRA_BASE_URL}/browse/${jiraKey}|${jiraKey}>`);
  } else {
    await respond(`:x: Error creating Jira ticket.`);
  }
});

// Home page event - when user opens the app home
app.event('app_home_opened', async ({ event, client }) => {
  try {
    // Send onboarding DM only once per user
    if (!onboardedUsers.has(event.user)) {
      await client.chat.postMessage({
        channel: event.user,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Hi there, I'm starship!\n\nI automate creating tickets.\n\nI can turn your conversations into tickets in seconds :fast_forward:\n\nFirst, you need to give starship permissions on Slack."
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Authorize starship"
                },
                style: "primary",
                url: "https://google.com"
              }
            ]
          }
        ]
      });
      
      onboardedUsers.add(event.user);
      console.log(`✅ Onboarding message sent to user: ${event.user}`);
    }

    // Update the home page
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Create tickets in seconds"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*1. @starship in a thread*\nI'll organize the conversation into a ticket, & post it on the thread on your behalf.\nI'll also follow up in the thread when the ticket is marked as done.\n\n*2. Direct message starship with create... or make...*\nExample: \"create a bug for a login issue on iOS. Put in mobile bugs epic. Assign to Joe.\"\n\n*3. Use /ticket*\nUse /ticket to create an issue from anywhere.\nExample: /ticket make a new task for the profile update in the next sprint\n\n*4. Forward messages to starship*\nForward a message or thread, and I'll turn it into a ticket.\nI can also analyze images :sunrise: while creating tickets."
            }
          },
          {
            type: "divider"
          },
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Adjust Settings"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Want to adjust your Jira settings?\n• Choose your Jira project & boards.\n• Configure multiple Jira projects.\n• Add custom fields to populate.\n\nSend me a direct message saying \"settings\"."
            }
          }
        ]
      }
    });
    
    console.log(`🏠 Home page updated for user: ${event.user}`);
    
  } catch (error) {
    console.error('Error handling app_home_opened:', error);
  }
});

(async () => {
  // Don't start the app in HTTP mode - Vercel will handle the requests
  console.log('⚡️ Starship configured for HTTP Mode (Vercel)!');
  console.log('Available endpoints:');
  console.log('- POST /slack/events (for events)');
  console.log('- POST /slack/commands (for slash commands)');
})();

// Export the app for Vercel serverless functions
module.exports = app;
