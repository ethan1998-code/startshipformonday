import { App } from '@slack/bolt';

// Initialize Slack app
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = '';
  await new Promise((resolve) => {
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', resolve);
  });

  try {
    const data = JSON.parse(body);
    
    // Handle URL verification challenge
    if (data && data.challenge) {
      return res.status(200).json({ challenge: data.challenge });
    }

    // Process the request with Slack Bolt
    const slackRequest = {
      body: data,
      headers: req.headers,
    };

    await slackApp.processEvent(slackRequest);
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Slack event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}