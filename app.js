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

// Only DM once per user
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

// Handler for @starship (mention)
app.event('app_mention', async ({ event, client, say }) => {
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
    threadToJiraKey[event.thread_ts || event.ts] = jiraKey;

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

// Home Tab handler for custom homepage
app.event('app_home_opened', async ({ event, client }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        callback_id: 'home_view',
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "Starship AI" }
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: "*Create Jira tickets instantly!*" }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Create tickets in seconds*\n\n" +
                "1. `@Starship` *in a thread*\n" +
                "I'll organize the conversation into a ticket, and post it on the thread on your behalf.\n" +
                "I'll also follow up in the thread when the ticket is marked as done.\n\n" +
                "2. *Direct message Starship with* `create...` *or* `make...`\n" +
                "Example: `create a bug for a login issue on iOS. Put in mobile bugs epic. Assign to Joe.`\n\n" +
                "3. *Use* `/ticket`\n" +
                "Use `/ticket` to create an issue from anywhere.\n" +
                "Example: `/ticket make a new task for the profile update in the next sprint`\n\n" +
                "4. *Forward messages to Starship*\n" +
                "Forward a message or thread, and I'll turn it into a ticket.\n\n" +
                "I can also analyze images 🖼️ while creating tickets."
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Adjust Settings*\n" +
                "*Want to adjust your Jira settings?*\n" +
                "• Choose your Jira project & boards.\n" +
                "• Configure multiple Jira projects.\n" +
                "• Add custom fields to populate.\n\n" +
                "Send me a direct message saying `settings`."
            }
          },
          {
            type: "image",
            image_url: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png", // Replace with your Starship logo if you want
            alt_text: "Starship Logo"
          }
        ]
      }
    });
  } catch (error) {
    console.error("Error publishing Home Tab:", error);
  }
});

// Handler to send a DM ONLY ONCE when a user opens the app (optional)
app.event('app_home_opened_dm', async ({ event, client }) => {
  try {
    // Only DM if the user hasn't already received the message
    if (!greetedUsers.has(event.user)) {
      await client.chat.postMessage({
        channel: event.user,
        text: "Ethan says hello",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Ethan says hello"
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Connect to Jira",
                  emoji: true
                },
                style: "primary",
                url: "https://google.com"
              }
            ]
          }
        ]
      });
      greetedUsers.add(event.user);
    }
  } catch (error) {
    console.error("Error sending DM:", error);
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Starship Bolt app running!');
})();
