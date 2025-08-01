// API endpoint pour tester la création de tickets Jira
import { NextRequest, NextResponse } from 'next/server';

const https = require('https');

interface JiraTicket {
  key: string;
  id: string;
  self: string;
}

// Function to make HTTP request
function makeHttpRequest(url: string, options: any, data: string): Promise<JiraTicket> {
  return new Promise((resolve, reject) => {
    console.log('🌐 makeHttpRequest started');
    console.log('  - URL:', url);
    console.log('  - Method:', options.method);
    console.log('  - Data length:', data ? data.length : 0);
    
    // Parse URL to get hostname and path
    const urlObj = new URL(url);
    
    // Optimize request options for better reliability
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers,
      agent: false, // Disable connection pooling for serverless
      timeout: 25000 // 25 second timeout
    };
    
    console.log('🔧 Request options:', JSON.stringify(requestOptions, null, 2));
    
    const req = https.request(requestOptions, (res: any) => {
      console.log('📡 Response received');
      console.log('  - Status code:', res.statusCode);
      
      let body = '';
      res.on('data', (chunk: any) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log('🏁 Response complete, body length:', body.length);
        
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Request successful');
            resolve(parsed);
          } else {
            console.log('❌ Request failed with status:', res.statusCode);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error: any) {
          console.error('❌ JSON parse error:', error.message);
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error: any) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    // Set a 25 second timeout
    req.setTimeout(25000, () => {
      console.error('❌ Request timeout (25s)');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      console.log('📤 Writing data to request...');
      req.write(data);
    }
    
    console.log('🚀 Ending request...');
    req.end();
  });
}

// Function to create Jira ticket
async function createJiraTicket(ticketData: { title: string; description: string }): Promise<JiraTicket> {
  try {
    console.log('🎫 createJiraTicket started with data:', ticketData);
    
    // Check environment variables
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN || !process.env.JIRA_PROJECT_KEY) {
      throw new Error('Missing required Jira environment variables');
    }
    
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    console.log('🔐 Jira auth token created');
    
    const jiraPayload = {
      fields: {
        project: {
          key: process.env.JIRA_PROJECT_KEY
        },
        summary: ticketData.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description
                }
              ]
            }
          ]
        },
        issuetype: {
          name: process.env.JIRA_ISSUE_TYPE || 'Task'
        }
      }
    };
    
    console.log('📋 Jira payload prepared');
    
    const data = JSON.stringify(jiraPayload);
    const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue`;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log('🚀 Calling makeHttpRequest...');
    const response = await makeHttpRequest(url, options, data);
    console.log('✅ Jira ticket created:', response);
    
    return response;
  } catch (error: any) {
    console.error('❌ Error creating Jira ticket:', error.message);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Test Jira API request received');
    console.log('📅 Current time:', new Date().toISOString());
    
    const body = await request.json();
    const { title, description } = body;
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Le titre du ticket est requis' }, 
        { status: 400 }
      );
    }

    console.log('🎫 Creating ticket:', { title, description });
    
    const startTime = Date.now();
    
    const ticketData = {
      title: title.trim(),
      description: description || `Ticket de test créé depuis la page web

Titre: ${title}
Créé le: ${new Date().toLocaleString('fr-FR')}
Source: Page de test Jira`
    };

    // Create the ticket
    const ticket = await createJiraTicket(ticketData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Ticket created successfully in', duration, 'ms');
    
    // Return success response
    return NextResponse.json({
      success: true,
      ticket: {
        key: ticket.key,
        id: ticket.id,
        self: ticket.self
      },
      duration: duration,
      message: `Ticket ${ticket.key} créé avec succès !`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in test-jira API:', error);
    
    let errorMessage = 'Erreur lors de la création du ticket';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Timeout - La requête vers Jira a pris trop de temps';
      statusCode = 408;
    } else if (error.message.includes('permission')) {
      errorMessage = 'Permissions insuffisantes pour créer le ticket';
      statusCode = 403;
    } else if (error.message.includes('400')) {
      errorMessage = 'Données invalides pour la création du ticket';
      statusCode = 400;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}

// Function to create Jira ticket
async function createJiraTicket(ticketData: any) {
  try {
    console.log('🎫 createJiraTicket started with data:', ticketData);
    
    // Check environment variables
    console.log('🔧 Environment check:');
    console.log('  - JIRA_BASE_URL:', process.env.JIRA_BASE_URL ? 'SET' : 'MISSING');
    console.log('  - JIRA_EMAIL:', process.env.JIRA_EMAIL ? 'SET' : 'MISSING');
    console.log('  - JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? 'SET' : 'MISSING');
    console.log('  - JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY ? 'SET' : 'MISSING');
    
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN || !process.env.JIRA_PROJECT_KEY) {
      throw new Error('Missing required Jira environment variables');
    }
    
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    console.log('🔐 Jira auth token created');
    
    const jiraPayload = {
      fields: {
        project: {
          key: process.env.JIRA_PROJECT_KEY
        },
        summary: ticketData.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description
                }
              ]
            }
          ]
        },
        issuetype: {
          name: process.env.JIRA_ISSUE_TYPE || 'Task'
        }
      }
    };
    
    console.log('📋 Jira payload prepared');
    
    const data = JSON.stringify(jiraPayload);
    const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue`;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log('🚀 Calling makeHttpRequest...');
    const response = await makeHttpRequest(url, options, data);
    console.log('✅ Jira ticket created:', response);
    
    return response;
  } catch (error: any) {
    console.error('❌ Error creating Jira ticket:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Test Jira API request received');
    console.log('📅 Current time:', new Date().toISOString());
    
    const body = await request.json();
    const { title, description } = body;
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Le titre du ticket est requis' }, 
        { status: 400 }
      );
    }

    console.log('🎫 Creating ticket:', { title, description });
    
    const startTime = Date.now();
    
    const ticketData = {
      title: title.trim(),
      description: description || `Ticket de test créé depuis la page web

Titre: ${title}
Créé le: ${new Date().toLocaleString('fr-FR')}
Source: Page de test Jira`
    };

    // Create the ticket
    const ticket = await createJiraTicket(ticketData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Ticket created successfully in', duration, 'ms');
    
    // Return success response
    return NextResponse.json({
      success: true,
      ticket: {
        key: ticket.key,
        id: ticket.id,
        self: ticket.self
      },
      duration: duration,
      message: `Ticket ${ticket.key} créé avec succès !`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in test-jira API:', error);
    
    let errorMessage = 'Erreur lors de la création du ticket';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Timeout - La requête vers Jira a pris trop de temps';
      statusCode = 408;
    } else if (error.message.includes('permission')) {
      errorMessage = 'Permissions insuffisantes pour créer le ticket';
      statusCode = 403;
    } else if (error.message.includes('400')) {
      errorMessage = 'Données invalides pour la création du ticket';
      statusCode = 400;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}

// Copie de la fonction makeHttpRequest optimisée
function makeHttpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    console.log('🌐 makeHttpRequest started');
    console.log('  - URL:', url);
    console.log('  - Method:', options.method);
    console.log('  - Data length:', data ? data.length : 0);
    
    // Parse URL to get hostname and path
    const urlObj = new URL(url);
    
    // Optimize request options for better reliability
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers,
      // Add keep-alive and timeout optimizations
      agent: false, // Disable connection pooling for serverless
      timeout: 25000 // 25 second timeout
    };
    
    console.log('🔧 Request options:', JSON.stringify(requestOptions, null, 2));
    
    const req = https.request(requestOptions, (res) => {
      console.log('📡 Response received');
      console.log('  - Status code:', res.statusCode);
      
      let body = '';
      res.on('data', chunk => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log('🏁 Response complete, body length:', body.length);
        
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Request successful');
            resolve(parsed);
          } else {
            console.log('❌ Request failed with status:', res.statusCode);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          console.error('❌ JSON parse error:', error.message);
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    // Set a 25 second timeout (maximum for Vercel serverless)
    req.setTimeout(25000, () => {
      console.error('❌ Request timeout (25s)');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      console.log('📤 Writing data to request...');
      req.write(data);
    }
    
    console.log('🚀 Ending request...');
    req.end();
  });
}

// Function to create Jira ticket
async function createJiraTicket(ticketData) {
  try {
    console.log('🎫 createJiraTicket started with data:', ticketData);
    
    // Check environment variables
    console.log('🔧 Environment check:');
    console.log('  - JIRA_BASE_URL:', process.env.JIRA_BASE_URL ? 'SET' : 'MISSING');
    console.log('  - JIRA_EMAIL:', process.env.JIRA_EMAIL ? 'SET' : 'MISSING');
    console.log('  - JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? 'SET' : 'MISSING');
    console.log('  - JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY ? 'SET' : 'MISSING');
    
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN || !process.env.JIRA_PROJECT_KEY) {
      throw new Error('Missing required Jira environment variables');
    }
    
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    console.log('🔐 Jira auth token created');
    
    const jiraPayload = {
      fields: {
        project: {
          key: process.env.JIRA_PROJECT_KEY
        },
        summary: ticketData.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description
                }
              ]
            }
          ]
        },
        issuetype: {
          name: process.env.JIRA_ISSUE_TYPE || 'Task'
        }
      }
    };
    
    console.log('📋 Jira payload prepared');
    
    const data = JSON.stringify(jiraPayload);
    const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue`;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log('🚀 Calling makeHttpRequest...');
    const response = await makeHttpRequest(url, options, data);
    console.log('✅ Jira ticket created:', response);
    
    return response;
  } catch (error) {
    console.error('❌ Error creating Jira ticket:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS for frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📥 Test Jira API request received');
    console.log('📅 Current time:', new Date().toISOString());
    
    const { title, description } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre du ticket est requis' });
    }

    console.log('🎫 Creating ticket:', { title, description });
    
    const startTime = Date.now();
    
    const ticketData = {
      title: title.trim(),
      description: description || `Ticket de test créé depuis la page web

Titre: ${title}
Créé le: ${new Date().toLocaleString('fr-FR')}
Source: Page de test Jira`
    };

    // Create the ticket
    const ticket = await createJiraTicket(ticketData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Ticket created successfully in', duration, 'ms');
    
    // Return success response
    return res.status(200).json({
      success: true,
      ticket: {
        key: ticket.key,
        id: ticket.id,
        self: ticket.self
      },
      duration: duration,
      message: `Ticket ${ticket.key} créé avec succès !`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in test-jira API:', error);
    
    let errorMessage = 'Erreur lors de la création du ticket';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Timeout - La requête vers Jira a pris trop de temps';
      statusCode = 408;
    } else if (error.message.includes('permission')) {
      errorMessage = 'Permissions insuffisantes pour créer le ticket';
      statusCode = 403;
    } else if (error.message.includes('400')) {
      errorMessage = 'Données invalides pour la création du ticket';
      statusCode = 400;
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
