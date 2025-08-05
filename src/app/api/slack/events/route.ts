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
    const { app: slackApp, receiver: slackReceiver } = getSlackApp();
    
    if (!slackApp || !slackReceiver) {
      return NextResponse.json(
        { error: 'Slack app not configured' },
        { status: 503 }
      );
    }

    const body = await request.text();
    
    // Parse the body for URL verification
    const parsedBody = JSON.parse(body);
    
    // Handle URL verification challenge
    if (parsedBody.type === 'url_verification') {
      return NextResponse.json({ challenge: parsedBody.challenge });
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

// Handle URL verification challenge for GET requests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ ok: true });
}
