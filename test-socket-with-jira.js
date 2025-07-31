const { App } = require('@slack/bolt');
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
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

// Handler simplifié pour /ticket
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();
  
  console.log('📝 Commande /ticket reçue:', command.text);
  
  const summary = command.text.trim();
  if (!summary) {
    await respond({
      response_type: 'ephemeral',
      text: '❌ Veuillez fournir un résumé. Usage: `/ticket Votre résumé ici`'
    });
    return;
  }

  try {
    // Créer un vrai ticket Jira
    const axios = require('axios');
    
    if (!process.env.JIRA_API_TOKEN || !process.env.JIRA_EMAIL) {
      throw new Error('Token API Jira ou email manquant');
    }
    
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    const jiraData = {
      fields: {
        project: {
          key: process.env.JIRA_PROJECT_KEY || 'AL'
        },
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  text: `Ticket créé depuis Slack par <@${command.user_id}>\n\nCanal: <#${command.channel_id}>`,
                  type: 'text'
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
    
    console.log('🔄 Création du ticket Jira...', jiraData);
    
    const response = await axios.post(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
      jiraData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    const ticketKey = response.data.key;
    const ticketUrl = `${process.env.JIRA_BASE_URL}/browse/${ticketKey}`;
    
    console.log('✅ Ticket Jira créé:', ticketKey);
    
    await respond({
      response_type: 'in_channel',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎫 *Ticket Jira créé avec succès!*\n\n*${ticketKey}*: ${summary}\n\n📍 Projet: ${process.env.JIRA_PROJECT_KEY}\n👤 Créé par: <@${command.user_id}>`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Voir dans Jira'
              },
              url: ticketUrl,
              action_id: 'view_jira_ticket'
            }
          ]
        }
      ]
    });
    
  } catch (error) {
    console.error('❌ Erreur création ticket:', error);
    await respond({
      response_type: 'ephemeral',
      text: `❌ Erreur lors de la création du ticket: ${error.message}`
    });
  }
});

// Handler pour @starship mentions avec IA
app.event('app_mention', async ({ event, say, client }) => {
  console.log('🤖 Mention @starship reçue:', event.text);
  
  try {
    // Vérifier si c'est une demande d'aide simple
    if (event.text.toLowerCase().includes('help')) {
      await say({
        text: `Salut <@${event.user}>! 👋 Je suis Starship, votre assistant IA pour Jira.\n\nCommandes disponibles:\n• \`/ticket [résumé]\` - Créer un ticket Jira simple\n• \`@starship\` - Analyser ce thread et créer un ticket intelligent avec IA\n• \`@starship help\` - Afficher cette aide`,
        thread_ts: event.ts
      });
      return;
    }

    // Si OpenAI n'est pas configuré, utiliser mode basique
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      await say({
        text: `🤖 Analyse IA non disponible (clé OpenAI manquante).\n\nUtilisez \`/ticket [résumé]\` pour créer un ticket simple.`,
        thread_ts: event.ts
      });
      return;
    }

    // Récupérer l'historique du thread (avec gestion d'erreur)
    console.log('📜 Récupération de l\'historique du thread...');
    
    let conversationContext = event.text || '';
    let threadHistory = null;
    
    try {
      threadHistory = await client.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts || event.ts,
        limit: 50
      });
      
      if (threadHistory.messages && threadHistory.messages.length > 0) {
        conversationContext = threadHistory.messages
          .filter(msg => msg.text && !msg.text.includes('<@U'))  // Filtrer les mentions
          .map(msg => `• ${msg.text}`)
          .join('\n');
      }
    } catch (error) {
      console.log('⚠️ Impossible de récupérer l\'historique, utilisation du message actuel:', error.message);
      conversationContext = `Message actuel: ${event.text}`;
    }

    console.log('🧠 Contexte préparé pour OpenAI:', conversationContext.substring(0, 200) + '...');

    // Analyser avec OpenAI (simulation pour l'instant)
    const messageCount = threadHistory ? threadHistory.messages.length : 1;
    await say({
      text: `🔄 Analyse de la conversation en cours avec l'IA...\n\n📝 Messages analysés: ${messageCount}\n⏱️ Génération du ticket intelligent en cours...`,
      thread_ts: event.ts
    });

    // TODO: Appel OpenAI réel ici
    const aiAnalysis = await analyzeWithOpenAI(conversationContext);
    
    // Créer le ticket Jira avec l'analyse IA
    const ticketResult = await createIntelligentJiraTicket(aiAnalysis, event.user, event.channel);
    
    await say({
      text: `✅ **Ticket intelligent créé!**\n\n🎫 **${ticketResult.key}**: ${ticketResult.title}\n\n📋 **Description générée par IA**\n🔗 [Voir dans Jira](${ticketResult.url})`,
      thread_ts: event.ts
    });

  } catch (error) {
    console.error('❌ Erreur analyse IA:', error);
    await say({
      text: `❌ Erreur lors de l'analyse IA: ${error.message}`,
      thread_ts: event.ts
    });
  }
});

// Fonction d'analyse OpenAI
async function analyzeWithOpenAI(conversationText) {
  console.log('🧠 Analyse avec OpenAI...', conversationText.substring(0, 100));
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Simulation pour les tests
    return {
      title: "Fonctionnalité analysée par IA",
      description: `Analyse automatique de la conversation.\n\nDefinition of Done:\n- Analyser les requirements\n- Implémenter la solution\n- Tester la fonctionnalité\n- Documenter les changements\n\nContexte:\n${conversationText.substring(0, 500)}`
    };
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Analysez cette conversation Slack et générez un ticket Jira structuré:

CONVERSATION:
${conversationText}

Générez un JSON avec:
1. "title": Un titre concis et actionnable
2. "description": Une description détaillée avec Definition of Done

Répondez uniquement en JSON valide.`;

    console.log('🤖 Envoi à OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    const content = response.choices[0].message.content.trim();
    console.log('✅ Réponse OpenAI reçue:', content.substring(0, 200));
    
    // Nettoyer la réponse si elle contient des markdown
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('❌ Erreur OpenAI:', error.message);
    // Fallback en cas d'erreur
    return {
      title: "Ticket analysé automatiquement",
      description: `Analyse automatique basée sur: ${conversationText.substring(0, 300)}...\n\nDefinition of Done:\n- Analyser les requirements\n- Implémenter la solution\n- Tester la fonctionnalité`
    };
  }
}

// Fonction pour créer un ticket Jira intelligent
async function createIntelligentJiraTicket(aiAnalysis, userId, channelId) {
  const axios = require('axios');
  
  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  
  const jiraData = {
    fields: {
      project: { key: process.env.JIRA_PROJECT_KEY || 'AL' },
      summary: aiAnalysis.title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { 
                text: aiAnalysis.description || `Ticket créé depuis Slack par ${userId}`, 
                type: 'text' 
              }
            ]
          }
        ]
      },
      issuetype: { name: process.env.JIRA_ISSUE_TYPE || 'Task' }
    }
  };

  console.log('📋 Données Jira à envoyer:', JSON.stringify(jiraData, null, 2));

  try {
    const response = await axios.post(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
      jiraData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      key: response.data.key,
      title: aiAnalysis.title,
      url: `${process.env.JIRA_BASE_URL}/browse/${response.data.key}`
    };
  } catch (error) {
    console.error('❌ Erreur détaillée Jira:', error.response?.data || error.message);
    throw error;
  }
}

(async () => {
  await app.start();
  console.log('⚡️ Starship fonctionne en mode Socket !');
  console.log('Testez dans Slack:');
  console.log('- /ticket Mon premier test');
  console.log('- @starship hello');
})();
