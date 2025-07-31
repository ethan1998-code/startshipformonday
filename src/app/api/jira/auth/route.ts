import { NextRequest, NextResponse } from 'next/server';
import { JiraOAuthManager } from '@/lib/jira';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing team_id parameter' },
        { status: 400 }
      );
    }

    const oauthManager = new JiraOAuthManager();
    const authUrl = oauthManager.getAuthorizationUrl(teamId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Jira auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
