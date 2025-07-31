const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

console.log('🚀 Test des variables d\'environnement:');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✓ Défini' : '✗ Manquant');
console.log('SLACK_APP_TOKEN:', process.env.SLACK_APP_TOKEN ? '✓ Défini' : '✗ Manquant');
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✓ Défini' : '✗ Manquant');
console.log('JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY || 'Non défini');

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
  console.error('❌ Variables d\'environnement manquantes !');
  process.exit(1);
}

console.log('✅ Toutes les variables sont définies !');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Mémoire temporaire pour thread Slack <-> clé Jira
const threadToJiraKey = {};

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
    console.error("Erreur Jira:", error.response ? error.response.data : error.message);
    return null;
  }
}

// Handler pour /ticket
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();
  console.log('📝 Commande /ticket reçue:', command.text);
  
  await respond({
    text: command.thread_ts ? "Creating ticket from thread..." : "Creating ticket...",
    response_type: "ephemeral"
  });

  const summary = command.text || "New ticket from Slack";
  // Pas de description automatique - seulement le titre suffit
  const jiraKey = await createJiraTicket(summary, "");

  if (jiraKey) {
    if (command.thread_ts) {
      threadToJiraKey[command.thread_ts] = jiraKey;
    } else {
      threadToJiraKey[command.ts] = jiraKey;
    }
    await respond(`:white_check_mark: Ticket Jira créé : <${process.env.JIRA_BASE_URL}/browse/${jiraKey}|${jiraKey}>`);
  } else {
    await respond(`:x: Erreur lors de la création du ticket Jira.`);
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Starship fonctionne en mode Socket !');
  console.log('Testez dans Slack:');
  console.log('- /ticket Mon premier test');
  console.log('- @starship hello');
})();
