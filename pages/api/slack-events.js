// Slack Events API for Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'OK', 
      message: 'Slack Events API is running',
      timestamp: new Date().toISOString(),
      method: 'GET'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    
    // Handle URL verification challenge
    if (data && data.challenge) {
      console.log('Received challenge:', data.challenge);
      return res.status(200).json({ challenge: data.challenge });
    }

    // Handle URL verification with type
    if (data && data.type === 'url_verification' && data.challenge) {
      console.log('URL verification challenge:', data.challenge);
      return res.status(200).json({ challenge: data.challenge });
    }

    // Handle other Slack events
    console.log('Received Slack event:', data);
    
    return res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Error processing Slack event:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}