const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// --------- PAGE D'ACCUEIL (APP HOME) ---------
app.event('app_home_opened', async ({ event, client }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        "type": "home",
        "blocks": [
          {
            "type": "section",
            "text": { "type": "mrkdwn", "text": "*Starship AI*\nCreate Jira tickets Instantly!" },
            "accessory": {
              "type": "image",
              "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Star_icon-72a7cf.svg/1200px-Star_icon-72a7cf.svg.png",
              "alt_text": "Starship logo"
            }
          },
          { "type": "divider" },
          {
            "type": "header",
            "text": { "type": "plain_text", "text": "Create tickets in seconds" }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text":
`1. \`@Starship\` in a thread
I'll organize the conversation into a ticket, & post it on the thread on your behalf.
I'll also follow up in the thread when the ticket is marked as done.

2. Direct message Starship with \`create...\` or \`make...\`
Example: "create a bug for a login issue on iOS. Put in mobile bugs epic. Assign to Joe."

3. Use \`/ticket\`
Use \`/ticket\` to create an issue from anywhere.
Example: \`/ticket make a new task for the profile update in the next sprint\`

4. Forward messages to Starship
Forward a message or thread, and I'll turn it into a ticket.

I can also analyze images :framed_picture: while creating tickets.`
            }
          },
          { "type": "divider" },
          {
            "type": "header",
            "text": { "type": "plain_text", "text": "Adjust Settings" }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text":
`*Want to adjust your Jira settings?*
• Choose your Jira project & boards.
• Configure multiple Jira projects.
• Add custom fields to populate.

Send me a direct message saying "settings".`
            }
          }
        ]
      }
    });
  } catch (e) {
    console.error("Erreur lors du publish App Home :", e.data || e);
  }
});

// Mémoire temporaire pour thread Slack <-> clé Jira
const threadToJiraKey = {};

// Récupère l'historique d'un thread Slack
async function getThreadHistory(channel, thread_ts, token) {
  const res = await axios.get('https://slack.com/api/conversations.replies', {
    params: { channel, ts: thread_ts },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.data.ok) return res.data.messages;
  throw new Error('Impossible de récupérer le thread');
}

// Génère titre et description DOD via OpenAI
async function summarizeThread(messages) {
  const conversation = messages
    .map(m => (m.user ? `<@${m.user}>: ${m.text}` : m.text))
    .join('\n');
  const prompt = `
Voici une discussion Slack technique entre plusieurs personnes. Génère pour création de ticket Jira :
- Un titre synthétique (summary)
- Une description structurée type DOD (avec sections Problème, Solution, Critères d’acceptation)
Format attendu :
Titre: <titre>
Description:
Problème: ...
Solution: ...
Critères d’acceptation: ...
Conversation Slack:
${conversation}
`;
  const openaiRes = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "Tu es un assistant qui résume des discussions Slack pour en faire des tickets Jira."},
        {role: "user", content: prompt}
      ],
      max_tokens: 450,
      temperature: 0.4
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return openaiRes.data.choices[0].message.content.trim();
}

// Parse la réponse OpenAI (titre + description)
function parseOpenAIResponse(text) {
  const titleMatch = text.match(/Titre\s*:\s*(.+)\n/i);
  const descMatch = text.match(/Description\s*:\s*([\s\S]*)/i);
  return {
    title: titleMatch ? titleMatch[1].trim() : "Ticket Slack",
    description: descMatch ? descMatch[1].trim() : text.trim()
  };
}

// Extrait les images du thread
function extractFilesFromThread(messages) {
  const files = [];
  for (const msg of messages) {
    if (msg.files) {
      for (const f of msg.files) {
        if (f.mimetype && f.mimetype.startsWith('image/')) {
          files.push(f.url_private);
        }
      }
    }
  }
  return files;
}

// Crée un ticket Jira
async function createJiraTicket(summary, description) {
  try {
    const response = await axios.post(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
      {
        fields: {
          project: { key: process.env.JIRA_PROJECT_KEY },
          summary: summary,
          description: {
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
          },
          issuetype: { name: "Task" }
        }
      },
      {
        auth: {
          username: process.env.JIRA_USER,
          password: process.env.JIRA_API_TOKEN
        },
        headers: {
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

// Cherche un utilisateur Jira par nom
async function findJiraUser(name) {
  try {
    const res = await axios.get(
      `${process.env.JIRA_BASE_URL}/rest/api/3/user/search?query=${encodeURIComponent(name)}`,
      {
        auth: {
          username: process.env.JIRA_USER,
          password: process.env.JIRA_API_TOKEN
        },
        headers: {
          "Accept": "application/json"
        }
      }
    );
    return res.data && res.data.length > 0 ? res.data[0] : null;
  } catch (error) {
    return null;
  }
}

// Assigne un ticket Jira à un utilisateur
async function assignJiraTicket(issueKey, accountId) {
  try {
    await axios.put(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/assignee`,
      { accountId },
      {
        auth: {
          username: process.env.JIRA_USER,
          password: process.env.JIRA_API_TOKEN
        },
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    return true;
  } catch (error) {
    return false;
  }
}

// Handler pour @starship (mention)
app.event('app_mention', async ({ event, client, say }) => {
  // Message éphémère (visible uniquement par l'utilisateur)
  await client.chat.postEphemeral({
    channel: event.channel,
    user: event.user,
    text: event.thread_ts ? "Creating ticket from thread..." : "Creating ticket...",
    thread_ts: event.thread_ts || event.ts
  });

  let summary = event.text.replace(/<@[^>]+>\s*/,'').trim() || "Ticket Slack";
  let description = "";

  // Détecte si on veut assigner à quelqu'un (anglais ou français)
  let assignee = null;
  const assignMatch = summary.match(/assign(?:ed)?\s+(?:to\s+)?([^\s]+)/i);
  const assignMatchFr = summary.match(/assigne(?:r)?\s*(?:à)?\s*([^\s]+)/i);
  if (assignMatch) {
    assignee = assignMatch[1];
    summary = summary.replace(assignMatch[0], '').trim();
  }
  if (assignMatchFr) {
    assignee = assignMatchFr[1];
    summary = summary.replace(assignMatchFr[0], '').trim();
  }

  if (event.thread_ts) {
    try {
      const threadMessages = await getThreadHistory(event.channel, event.thread_ts, process.env.SLACK_BOT_TOKEN);
      const aiText = await summarizeThread(threadMessages);
      const { title, description: aiDesc } = parseOpenAIResponse(aiText);
      summary = title;

      // Lien du thread Slack
      const threadUrl = `https://${process.env.SLACK_WORKSPACE}.slack.com/archives/${event.channel}/p${event.thread_ts.replace('.', '')}`;
      description = `${aiDesc}\n\n[Voir la conversation Slack](${threadUrl})`;

      // Ajout des images du thread
      const files = extractFilesFromThread(threadMessages);
      if (files.length) {
        description += "\n\nCaptures d’écran :\n";
        files.forEach(url => {
          description += `- ${url}\n`;
        });
      }
    } catch (err) {
      description = `Résumé impossible. Erreur : ${err.message}`;
    }
  } else {
    description = `Ticket créé par <@${event.user}> via mention @Starship dans Slack.`;
  }

  const jiraKey = await createJiraTicket(summary, description);

  if (jiraKey) {
    // On mémorise la correspondance thread <-> ticket Jira
    threadToJiraKey[event.thread_ts || event.ts] = jiraKey;

    // Si l'utilisateur veut assigner quelqu'un au ticket
    if (assignee) {
      const user = await findJiraUser(assignee);
      if (!user) {
        await client.chat.postEphemeral({
          channel: event.channel,
          user: event.user,
          text: `Utilisateur Jira "${assignee}" non trouvé.`
        });
      } else {
        const assignOK = await assignJiraTicket(jiraKey, user.accountId);
        if (assignOK) {
          await say({
            thread_ts: event.thread_ts || event.ts,
            text: `:bust_in_silhouette: Ticket assigné à ${assignee} sur Jira.`
          });
        } else {
          await say({
            thread_ts: event.thread_ts || event.ts,
            text: `:x: Impossible d’assigner le ticket à ${assignee}.`
          });
        }
      }
    }

    await say({
      thread_ts: event.thread_ts || event.ts,
      text: `:white_check_mark: Ticket Jira créé : <${process.env.JIRA_BASE_URL}/browse/${jiraKey}|${jiraKey}>`
    });
  } else {
    await say({
      thread_ts: event.thread_ts || event.ts,
      text: `:x: Erreur lors de la création du ticket Jira.`
    });
  }
});

// Handler pour /ticket
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    text: command.thread_ts ? "Creating ticket from thread..." : "Creating ticket...",
    response_type: "ephemeral"
  });

  const summary = command.text || "New ticket from Slack";
  const description = `Ticket créé par <@${command.user_id}> via la commande /ticket dans Slack.`;
  const jiraKey = await createJiraTicket(summary, description);

  if (jiraKey) {
    if (command.thread_ts) {
      threadToJiraKey[command.thread_ts] = jiraKey;
    } else {
      threadToJiraKey[command.ts] = jiraKey;
    }
    await respond(`:white_check_mark: Ticket Jira créé : <${process.env.JIRA_BASE_URL}/browse/${jiraKey}|${jiraKey}>`);
  } else {
    await respond(`:x: Erreur lors de la création du ticket Jira.`);
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Bolt app running!');
})();