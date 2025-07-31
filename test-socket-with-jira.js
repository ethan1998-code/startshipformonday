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

// Handler amélioré pour /ticket avec interface moderne
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();
  
  console.log('📝 Commande /ticket reçue:', command.text);
  
  const summary = command.text.trim();
  if (!summary) {
    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '❌ *Erreur de syntaxe*\n\nVeuillez fournir un résumé pour votre ticket.'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Usage:* `/ticket Votre résumé ici`\n*Exemple:* `/ticket Corriger le bug de connexion`'
          }
        }
      ]
    });
    return;
  }

  // Afficher un message de confirmation avec design moderne
  await respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🔄 *Création de votre ticket en cours...*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Titre:*\n${summary}`
          },
          {
            type: 'mrkdwn',
            text: `*Projet:*\n${process.env.JIRA_PROJECT_KEY || 'AL'}`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⏱️ Veuillez patienter pendant la création...'
          }
        ]
      }
    ]
  });

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
                  text: `📋 Ticket créé depuis Slack`,
                  type: 'text',
                  marks: [{ type: 'strong' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  text: `👤 Créé par: `,
                  type: 'text'
                },
                {
                  text: `<@${command.user_id}>`,
                  type: 'text',
                  marks: [{ type: 'code' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  text: `📍 Canal: `,
                  type: 'text'
                },
                {
                  text: `<#${command.channel_id}>`,
                  type: 'text',
                  marks: [{ type: 'code' }]
                }
              ]
            },
            {
              type: 'rule'
            },
            {
              type: 'paragraph',
              content: [
                {
                  text: `📝 Description: ${summary}`,
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
    
    // Répondre avec l'interface moderne améliorée
    await respond({
      response_type: 'in_channel',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎫 *Ticket créé avec succès !*`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Ouvrir dans Jira',
              emoji: true
            },
            value: ticketKey,
            url: ticketUrl,
            action_id: 'open_jira_ticket'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*ID du ticket:*\n\`${ticketKey}\``
            },
            {
              type: 'mrkdwn',
              text: `*Statut:*\n🆕 Nouveau`
            },
            {
              type: 'mrkdwn',
              text: `*Projet:*\n${process.env.JIRA_PROJECT_KEY || 'AL'}`
            },
            {
              type: 'mrkdwn',
              text: `*Créé par:*\n<@${command.user_id}>`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Titre:* ${summary}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `✅ Ticket ajouté au backlog • ${new Date().toLocaleString('fr-FR')}`
            }
          ]
        }
      ]
    });
    
  } catch (error) {
    console.error('❌ Erreur création ticket:', error);
    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '❌ *Erreur lors de la création du ticket*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`\n${error.message}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 Vérifiez vos permissions Jira ou contactez l\'administrateur'
            }
          ]
        }
      ]
    });
  }
});

// Handler amélioré pour @starship mentions avec analyse IA professionnelle
app.event('app_mention', async ({ event, say, client }) => {
  console.log('🤖 Mention @starship reçue:', event.text);
  
  try {
    // Vérifier si c'est une demande d'aide simple
    if (event.text.toLowerCase().includes('help')) {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👋 *Bonjour <@${event.user}> !*\n\nJe suis *Starship*, votre assistant IA pour la gestion de projet.`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*🛠️ Mes capacités:*\n• `/ticket [titre]` - Créer un ticket Jira rapide\n• `@starship` dans un thread - Analyser la conversation et créer un ticket intelligent avec DoD professionnelle\n• `@starship help` - Afficher cette aide'
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💡 *Astuce:* Mentionnez-moi dans un thread de discussion pour que j\'analyse l\'historique complet et crée un ticket détaillé comme un Product Manager !'
              }
            ]
          }
        ],
        thread_ts: event.ts
      });
      return;
    }

    // Si OpenAI n'est pas configuré, utiliser mode basique
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '⚠️ *Analyse IA indisponible*\n\nLa clé OpenAI n\'est pas configurée.'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Alternative:* Utilisez `/ticket [résumé]` pour créer un ticket simple.'
            }
          }
        ],
        thread_ts: event.ts
      });
      return;
    }

    // Message initial d'analyse avec interface moderne
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🧠 *Analyse IA en cours...*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🔍 Récupération de l\'historique du thread\n⚡ Analyse avec OpenAI GPT-4\n📝 Génération de la Definition of Done'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '⏱️ Cela peut prendre quelques secondes...'
            }
          ]
        }
      ],
      thread_ts: event.ts
    });

    // Récupérer l'historique COMPLET du thread avec plus de détails
    console.log('📜 Récupération de l\'historique COMPLET du thread...');
    
    let fullConversationContext = '';
    let threadHistory = null;
    let messageCount = 0;
    
    try {
      // Récupérer plus de messages et inclure les metadata
      threadHistory = await client.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts || event.ts,
        limit: 100, // Augmenté pour capturer plus de contexte
        inclusive: true
      });
      
      if (threadHistory.messages && threadHistory.messages.length > 0) {
        messageCount = threadHistory.messages.length;
        
        // Construire un contexte riche avec timestamps et utilisateurs
        fullConversationContext = threadHistory.messages
          .filter(msg => msg.text && !msg.bot_id) // Exclure les bots mais garder les utilisateurs
          .map((msg, index) => {
            const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString('fr-FR');
            const user = msg.user ? `<@${msg.user}>` : 'Utilisateur';
            return `[${index + 1}] ${timestamp} - ${user}:\n${msg.text}\n`;
          })
          .join('\n---\n');
          
        console.log(`📊 ${messageCount} messages récupérés pour l'analyse`);
      } else {
        fullConversationContext = `Message initial: ${event.text}`;
        messageCount = 1;
      }
    } catch (error) {
      console.log('⚠️ Erreur récupération historique:', error.message);
      fullConversationContext = `Message actuel: ${event.text}`;
      messageCount = 1;
    }

    console.log('🧠 Contexte préparé pour analyse IA:', fullConversationContext.substring(0, 300) + '...');

    // Analyser avec OpenAI en mode Product Manager professionnel
    const aiAnalysis = await analyzeWithOpenAIProductManager(fullConversationContext, messageCount);
    
    // Créer le ticket Jira avec l'analyse IA professionnelle
    const ticketResult = await createIntelligentJiraTicket(aiAnalysis, event.user, event.channel);
    
    // Réponse avec interface moderne et détaillée
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Ticket intelligent créé par l\'IA !*'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Ouvrir dans Jira',
              emoji: true
            },
            url: ticketResult.url,
            action_id: 'open_ai_ticket'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Ticket ID:*\n\`${ticketResult.key}\``
            },
            {
              type: 'mrkdwn',
              text: `*Messages analysés:*\n${messageCount} messages`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*� Titre généré:*\n${ticketResult.title}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🤖 Analysé par OpenAI GPT-4 • Definition of Done générée automatiquement'
            }
          ]
        }
      ],
      thread_ts: event.ts
    });

  } catch (error) {
    console.error('❌ Erreur analyse IA:', error);
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '❌ *Erreur lors de l\'analyse IA*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`\n${error.message}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 Réessayez ou utilisez `/ticket` pour un ticket simple'
            }
          ]
        }
      ],
      thread_ts: event.ts
    });
  }
});

// Fonction d'analyse OpenAI spécialisée Product Manager
async function analyzeWithOpenAIProductManager(conversationText, messageCount) {
  console.log('🧠 Analyse Product Manager avec OpenAI...', conversationText.substring(0, 100));
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Simulation sophistiquée pour les tests
    return {
      title: "Feature analysée automatiquement",
      description: `**🎯 CONTEXTE**
Cette tâche a été générée automatiquement à partir d'une conversation Slack de ${messageCount} messages.

**📋 DESCRIPTION**
Analyse et implémentation basée sur les discussions de l'équipe.

**✅ DEFINITION OF DONE**
- [ ] Analyser les requirements identifiés dans la conversation
- [ ] Implémenter la solution proposée
- [ ] Effectuer les tests unitaires et d'intégration
- [ ] Documenter les changements apportés
- [ ] Valider avec les stakeholders
- [ ] Déployer en environnement de test
- [ ] Obtenir l'approbation finale

**🔗 CONTEXTE ORIGINAL**
${conversationText.substring(0, 500)}...

**📊 CRITÈRES D'ACCEPTATION**
- La solution doit répondre aux besoins exprimés
- Le code doit respecter les standards de qualité
- La documentation doit être mise à jour`
    };
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const expertPrompt = `Tu es un Product Manager senior expérimenté. Analyse cette conversation Slack d'équipe et génère un ticket Jira professionnel.

CONVERSATION SLACK (${messageCount} messages):
===
${conversationText}
===

INSTRUCTIONS:
1. Génère un titre concis et actionnable (max 60 caractères)
2. Crée une description structurée comme un PM professionnel avec:
   - 🎯 Contexte business
   - 📋 Description détaillée
   - ✅ Definition of Done complète et précise
   - 📊 Critères d'acceptation spécifiques
   - 🔗 Références ou dépendances si mentionnées

RÈGLES:
- DoD doit avoir 5-8 points actionables avec checkboxes
- Utilise les emojis pour la lisibilité
- Sois spécifique et mesurable
- Inclus les aspects techniques ET business
- Format Markdown professionnel

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "title": "Titre concis et actionnable",
  "description": "Description markdown structurée comme décrit ci-dessus"
}`;

    console.log('🤖 Envoi à OpenAI GPT-4 (mode Product Manager)...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: expertPrompt }],
      max_tokens: 1500,
      temperature: 0.3 // Plus déterministe pour la cohérence professionnelle
    });

    const content = response.choices[0].message.content.trim();
    console.log('✅ Réponse OpenAI reçue:', content.substring(0, 200) + '...');
    
    // Nettoyer la réponse
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('❌ Erreur OpenAI:', error.message);
    // Fallback professionnel en cas d'erreur
    return {
      title: "Tâche analysée par IA",
      description: `**🎯 CONTEXTE**
Ticket généré automatiquement à partir d'une conversation Slack de ${messageCount} messages.

**📋 DESCRIPTION**
${conversationText.substring(0, 400)}...

**✅ DEFINITION OF DONE**
- [ ] Analyser les requirements mentionnés dans la conversation
- [ ] Concevoir la solution technique appropriée
- [ ] Implémenter les fonctionnalités demandées
- [ ] Effectuer les tests unitaires et d'intégration
- [ ] Rédiger la documentation technique
- [ ] Effectuer une revue de code
- [ ] Tester en environnement de staging
- [ ] Déployer et valider en production

**📊 CRITÈRES D'ACCEPTATION**
- La solution répond aux besoins exprimés dans la conversation
- Le code respecte les standards de qualité de l'équipe
- La documentation est complète et à jour
- Les tests passent avec succès

**⚠️ NOTE**
Analyse générée automatiquement - vérifier les détails avec l'équipe.`
    };
  }
}

// Fonction pour créer un ticket Jira intelligent avec formatage professionnel
async function createIntelligentJiraTicket(aiAnalysis, userId, channelId) {
  const axios = require('axios');
  
  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  
  // Convertir la description Markdown en format Atlassian Document Format (ADF)
  const descriptionText = aiAnalysis.description || `Ticket créé automatiquement depuis Slack`;
  
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
                text: "🤖 TICKET GÉNÉRÉ PAR IA", 
                type: 'text',
                marks: [{ type: 'strong' }]
              }
            ]
          },
          {
            type: 'rule'
          },
          {
            type: 'paragraph',
            content: [
              { 
                text: descriptionText, 
                type: 'text' 
              }
            ]
          },
          {
            type: 'rule'
          },
          {
            type: 'paragraph',
            content: [
              { 
                text: "📍 MÉTADONNÉES", 
                type: 'text',
                marks: [{ type: 'strong' }]
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { 
                text: `👤 Demandeur: ${userId}\n📱 Canal Slack: ${channelId}\n🕒 Créé: ${new Date().toLocaleString('fr-FR')}\n🤖 Analysé par: OpenAI GPT-4`, 
                type: 'text' 
              }
            ]
          }
        ]
      },
      issuetype: { name: process.env.JIRA_ISSUE_TYPE || 'Task' },
      labels: ['ai-generated', 'slack-integration', 'starship']
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

    console.log('✅ Ticket Jira créé avec succès:', response.data.key);

    return {
      key: response.data.key,
      title: aiAnalysis.title,
      url: `${process.env.JIRA_BASE_URL}/browse/${response.data.key}`
    };
  } catch (error) {
    console.error('❌ Erreur détaillée Jira:', error.response?.data || error.message);
    throw new Error(`Erreur Jira: ${error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message}`);
  }
}

(async () => {
  await app.start();
  console.log('⚡️ Starship fonctionne en mode Socket !');
  console.log('Testez dans Slack:');
  console.log('- /ticket Mon premier test');
  console.log('- @starship hello');
})();
