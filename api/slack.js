// Main Vercel serverless function - handles all Slack requests
const app = require('../starship');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use the Bolt app's built-in request handler for Vercel
    const slackHandler = await app.receiver.requestHandler();
    return slackHandler(req, res);
  } catch (error) {
    console.error('Error in Slack handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
