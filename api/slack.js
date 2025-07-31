// Main Vercel serverless function - handles all Slack requests
const app = require('../starship');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle Slack URL verification challenge
  if (req.body && req.body.type === 'url_verification') {
    console.log('📋 Slack URL verification challenge received');
    return res.status(200).json({ challenge: req.body.challenge });
  }

  try {
    // Debug: Log incoming request
    console.log('📥 Incoming request headers:', req.headers);
    console.log('📥 Incoming request body:', req.body);
    console.log('📥 Incoming request content-type:', req.headers['content-type']);

    // Handle different content types from Slack
    let bodyString;
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      // Reconstruct form-encoded string from parsed object
      const querystring = require('querystring');
      bodyString = querystring.stringify(req.body);
    } else {
      bodyString = JSON.stringify(req.body);
    }

    console.log('📤 Processed body string:', bodyString);
    // Log avant envoi à Bolt
    console.log('📤 Sent to Bolt:', {
      body: bodyString,
      headers: req.headers,
      isBase64Encoded: false
    });

    const boltResponse = await app.processEvent({
      body: bodyString,
      headers: req.headers,
      isBase64Encoded: false
    });

    // Handle the response
    if (boltResponse) {
      res.status(boltResponse.statusCode || 200);
      
      if (boltResponse.headers) {
        Object.keys(boltResponse.headers).forEach(key => {
          res.setHeader(key, boltResponse.headers[key]);
        });
      }
      
      return res.send(boltResponse.body || '');
    }
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error in Slack handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
