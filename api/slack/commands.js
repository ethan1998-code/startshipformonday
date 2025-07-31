// Vercel serverless function for Slack slash commands
const app = require('../../starship');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle Slack slash commands through the Bolt app
    const slackHandler = await app.receiver.requestHandler();
    return slackHandler(req, res);
  } catch (error) {
    console.error('Error handling Slack command:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
