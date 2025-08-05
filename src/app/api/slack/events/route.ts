import { NextRequest, NextResponse } from 'next/server';
import { App, ExpressReceiver } from '@slack/bolt';
import { handleTicketCommand } from '@/handlers/ticket-command';
import { handleMention } from '@/handlers/mention';

let app: App | null = null;
let receiver: ExpressReceiver | null = null;

// Initialize Slack app lazily
function getSlackApp() {
  if (!app && process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET) {
    // Create Express receiver for HTTP mode
    receiver = new ExpressReceiver({
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
    });

    // Initialize Slack app
    app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      receiver,
    });

    // Register event handlers
    app.command('/ticket', handleTicketCommand);
    app.event('app_mention', handleMention);

    // Handle interactive components (buttons)
    app.action('create_monday_item', async ({ ack, body, respond }) => {
      await ack();
      // Handle Monday.com item creation from button click
      // Implementation would go here
    });

    app.action('modify_monday_item', async ({ ack, body, respond }) => {
      await ack();
      // Handle Monday.com item modification modal
      // Implementation would go here
    });
  }
  return { app, receiver };
}

// For HTTP Mode (production)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Parse the body for URL verification
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }
    
    // Handle URL verification challenge FIRST (before app initialization)
    if (parsedBody.type === 'url_verification') {
      console.log('Slack URL verification challenge received:', parsedBody.challenge);
      
      // Optional: Verify the token if you have SLACK_VERIFICATION_TOKEN
      // if (process.env.SLACK_VERIFICATION_TOKEN && parsedBody.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      //   return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      // }
      
      // Slack recommends responding with just the challenge value
      // We can use either text/plain or application/json
      return new NextResponse(parsedBody.challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Initialize Slack app only if we have the required environment variables
    const { app: slackApp, receiver: slackReceiver } = getSlackApp();
    
    if (!slackApp || !slackReceiver) {
      console.log('Slack app not configured - missing environment variables');
      return NextResponse.json(
        { error: 'Slack app not configured' },
        { status: 503 }
      );
    }

    // Create a mock Express request/response for Bolt
    const req = {
      body: parsedBody,
      headers: Object.fromEntries(request.headers.entries()),
      method: 'POST',
      url: request.url,
      rawBody: body,
    } as any;

    let responseData = '';
    let statusCode = 200;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      send: (data: any) => {
        responseData = typeof data === 'string' ? data : JSON.stringify(data);
        return res;
      },
      json: (data: any) => {
        responseData = JSON.stringify(data);
        return res;
      },
      end: (data?: string) => {
        if (data) responseData = data;
        return res;
      },
      writeHead: () => res,
      write: () => res,
      setHeader: () => res,
    } as any;

    // Process with Bolt
    await slackReceiver.requestHandler(req, res);

    return new NextResponse(responseData || '{}', { 
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Slack events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing and URL verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    console.log('Slack URL verification challenge via GET:', challenge);
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({
    message: 'Slack Events API Endpoint',
    status: 'Ready',
    timestamp: new Date().toISOString(),
    environment: {
      hasSlackBotToken: !!process.env.SLACK_BOT_TOKEN,
      hasSlackSigningSecret: !!process.env.SLACK_SIGNING_SECRET,
    }
  });
}
