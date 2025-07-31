// Main Vercel serverless function - handles all Slack requests
const app = require('../starship');

// Disable body parsing for raw access
export const config = {
  api: {
    bodyParser: false,
  },
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body data
    const rawBody = await getRawBody(req);
    console.log('📥 Raw body received:', rawBody);
    console.log('📥 Headers:', req.headers);

    // Handle Slack URL verification challenge
    if (rawBody.includes('"type":"url_verification"')) {
      const bodyObj = JSON.parse(rawBody);
      if (bodyObj.type === 'url_verification') {
        console.log('📋 Slack URL verification challenge received');
        return res.status(200).json({ challenge: bodyObj.challenge });
      }
    }

    console.log('📤 Sending to Bolt:', {
      body: rawBody,
      headers: req.headers,
      isBase64Encoded: false
    });

    const boltResponse = await app.processEvent({
      body: rawBody,
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
