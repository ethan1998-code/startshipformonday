import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Environment Variables Status',
    timestamp: new Date().toISOString(),
    environment: {
      hasSlackBotToken: !!process.env.SLACK_BOT_TOKEN,
      hasSlackSigningSecret: !!process.env.SLACK_SIGNING_SECRET,
      hasSlackAppToken: !!process.env.SLACK_APP_TOKEN,
      hasMondayApiToken: !!process.env.MONDAY_API_TOKEN,
      hasOpenAiApiKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
    status: 'Ready for testing'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test challenge response
    if (body.type === 'url_verification') {
      console.log('Test challenge received:', body.challenge);
      return new NextResponse(body.challenge, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return NextResponse.json({
      message: 'Test endpoint received POST',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid JSON',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
