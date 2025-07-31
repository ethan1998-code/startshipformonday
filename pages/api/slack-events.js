// Simple API route for Slack Events (without Bolt for now)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'OK', 
      message: 'Slack Events API is running',
      timestamp: new Date().toISOString()
    });
  }

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
      console.log('Received challenge:', data.challenge);
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