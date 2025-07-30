const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Temporary memory for Slack thread <-> Jira key
const threadToJiraKey = {};

// === AJOUT pour ne DM qu'une fois par utilisateur ===
const greetedUsers = new Set();

// Retrieve the history of a Slack thread
async function getThreadHistory(channel, thread_ts, token) {
  const res = await axios.get('https://slack.com/api/conversations.replies', {
    params: { channel, ts: thread_ts },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.data.ok) return res.data.messages;
  throw new Error('Unable to fetch thread');
}

// Generate summary and DOD description via OpenAI
async function summarizeThread(messages) {
  const conversation = messages
    .map(m => (m.user ? `<@${m.user}>: ${m.text}` : m.text))
    .join('\n');
  const prompt = `
Here is a technical Slack discussion between several people. Generate for Jira ticket creation:
- A concise title (summary)
- A structured DOD-type description (with sections Problem, Solution, Acceptance Criteria)
Expected format:
Title: <title>
Description:
Problem: ...
Solution: ...
Acceptance Criteria: ...
Slack Conversation:
${conversation}
`;
  const openaiRes = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "You are an assistant that summarizes Slack discussions to create Jira tickets."},
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

// Parse the OpenAI response (title + description)
function parseOpenAIResponse(text) {
  const titleMatch = text.match(/Title\s*:\s*(.+)\n/i);
  const descMatch = text.match(/Description\s*:\s*([\s\S]*)/i);
  return {
    title: titleMatch ? titleMatch[1].trim() : "Slack Ticket",
    description: descMatch ? descMatch[1].trim() : text.trim()
  };
}

// Extract images from the thread
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

// Create a Jira ticket
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
    console.error("Jira error:", error.response ? error.response.data : error.message);
    return null;
  }
}

// Search for a Jira user by name
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

// Assign a Jira ticket to a user
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

// Handler for @starshipv1 (mention)
app.event('app_mention', async ({ event, client, say }) => {
  // Ephemeral message (visible only to the user)
  await client.chat.postEphemeral({
    channel: event.channel,
    user: event.user,
    text: event.thread_ts ? "Creating ticket from thread..." : "Creating ticket...",
    thread_ts: event.thread_ts || event.ts
  });

  let summary = event.text.replace(/<@[^>]+>\s*/,'').trim() || "Slack Ticket";
  let description = "";

  // Detect if we want to assign to someone (English or French)
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

      // Slack thread link
      const threadUrl = `https://${process.env.SLACK_WORKSPACE}.slack.com/archives/${event.channel}/p${event.thread_ts.replace('.', '')}`;
      description = `${aiDesc}\n\n[View Slack conversation](${threadUrl})`;

      // Add images from the thread
      const files = extractFilesFromThread(threadMessages);
      if (files.length) {
        description += "\n\nScreenshots:\n";
        files.forEach(url => {
          description += `- ${url}\n`;
        });
      }
    } catch (err) {
      description = `Summary failed. Error: ${err.message}`;
    }
  } else {
    description = `Ticket created by <@${event.user}> via @Starship mention in Slack.`;
  }

  const jiraKey = await createJiraTicket(summary, description);

  if (jiraKey) {
    // Store the mapping thread <-> Jira ticket
    threadToJiraKey[event.thread_ts || event.ts] = jiraKey;

    // If the user wants to assign someone to the ticket
    if (assignee) {
      const user = await findJiraUser(assignee);
      if (!user) {
        await client.chat.postEphemeral({
          channel: event.channel,
          user: event.user,
          text: `Jira user "${assignee}" not found.`
        });
      } else {
        const assignOK = await assignJiraTicket(jiraKey, user.accountId);
        if (assignOK) {
          await say({
            thread_ts: event.thread_ts || event.ts,
            text: `:bust_in_silhouette: Ticket assigned to ${assignee} on Jira.`
          });
        } else {
          await say({
            thread_ts: event.thread_ts || event.ts,
            text: `:x: Unable to assign the ticket to ${assignee}.`
          });
        }
      }
    }

    await say({
      thread_ts: event.thread_ts || event.ts,
      text: `:white_check_mark: Jira ticket created: <${process.env.JIRA_BASE_URL}/browse/${jiraKey}|${jiraKey}>`
    });
  } else {
    await say({
      thread_ts: event.thread_ts || event.ts,
      text: `:x: Error while creating the Jira ticket.`
    });
  }
});

// Handler for /ticket
app.command('/ticket', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    text: command.thread_ts ? "Creating ticket from thread..." : "Creating ticket...",
    response_type: "ephemeral"
  });

  const summary = command.text || "New ticket from Slack";
  const description = `Ticket created by <@${command.user_id}> via the /ticket command in Slack.`;
  const jiraKey = await createJiraTicket(summary, description);

  if (jiraKey) {
    if (command.thread_ts) {
      threadToJiraKey[command.thread_ts] = jiraKey;
    } else {
      threadToJiraKey[command.ts] = jiraKey;
    }
    await respond(`:white_check_mark: Jira ticket created: <${process.env.JIRA_BASE_URL}/browse/${jiraKey}|${jiraKey}>`);
  } else {
    await respond(`:x: Error while creating the Jira ticket.`);
  }
});

// Handler pour envoyer un DM UNE SEULE FOIS quand un utilisateur ouvre l'app (Accueil)
app.event('app_home_opened', async ({ event, client }) => {
  try {
    // On ne DM que si l'utilisateur n'a pas déjà reçu le message
    if (!greetedUsers.has(event.user)) {
      await client.chat.postMessage({
        channel: event.user,
        text: "Ethan dit hello",
      });
      greetedUsers.add(event.user);
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du DM :", error);
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Bolt app running!');
})();