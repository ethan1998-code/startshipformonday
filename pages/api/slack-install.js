export default function handler(req, res) {
  // Handle GET requests with simple response for testing
  if (req.method === 'GET') {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      return res.status(200).json({
        status: 'OK',
        message: 'Slack Install endpoint is running',
        note: 'SLACK_CLIENT_ID and SLACK_OAUTH_REDIRECT_URI required for OAuth flow',
        timestamp: new Date().toISOString()
      });
    }
    
    const scopes = "commands,chat:write,app_mentions:read";
    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    return res.status(200).json({
      status: 'OK',
      message: 'Slack Install endpoint is ready',
      install_url: url,
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
