import { NextRequest, NextResponse } from 'next/server';
import { App, ExpressReceiver } from '@slack/bolt';
import { handleTicketCommand } from '@/handlers/ticket-command';
import { handleMention } from '@/handlers/mention';

// Create Express receiver for HTTP mode
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Register event handlers
app.command('/ticket', handleTicketCommand);
app.event('app_mention', handleMention);

// Handle interactive components (buttons)
app.action('create_jira_ticket', async ({ ack, body, respond }) => {
  await ack();
  // Handle ticket creation from button click
  // Implementation would go here
});

app.action('modify_jira_ticket', async ({ ack, body, respond }) => {
  await ack();
  // Handle ticket modification modal
  // Implementation would go here
});

// For HTTP Mode (production)
export async function POST(request: NextRequest) {
  try {
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
    await receiver.requestHandler(req, res);

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
