import { NextRequest, NextResponse } from 'next/server';
import { JiraOAuthManager, WorkspaceManager } from '@/lib/jira';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the Slack team ID
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `/auth-result?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        '/auth-result?error=Missing authorization code or state'
      );
    }

    console.log('🔧 Environment variables check:');
    console.log('JIRA_CLIENT_ID:', process.env.JIRA_CLIENT_ID ? 'Defined' : 'Missing');
    console.log('JIRA_CLIENT_SECRET:', process.env.JIRA_CLIENT_SECRET ? 'Defined' : 'Missing');
    console.log('JIRA_REDIRECT_URI:', process.env.JIRA_REDIRECT_URI);

    const oauthManager = new JiraOAuthManager();
    
    // Exchange code for tokens
    const tokens = await oauthManager.exchangeCodeForTokens(code);
    
    console.log('✅ Tokens received:', {
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing'
    });
    
    // Get accessible resources
    const resources = await oauthManager.getAccessibleResources(tokens.access_token);
    
    if (!resources || resources.length === 0) {
      return NextResponse.redirect(
        '/auth-result?error=No accessible Jira resources found'
      );
    }

    // Use the first available resource (in production, you might want to let user choose)
    const jiraResource = resources[0];

    // Save workspace configuration
    await WorkspaceManager.save({
      slackTeamId: state,
      jiraCloudId: jiraResource.id,
      jiraBaseUrl: jiraResource.url,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: Date.now() + (tokens.expires_in * 1000),
    });

    return NextResponse.redirect(
      new URL(`/auth-result?success=true&resource=${encodeURIComponent(jiraResource.name)}`, 'http://localhost:3000')
    );

  } catch (error) {
    console.error('Jira callback error:', error);
    return NextResponse.redirect(
      new URL(`/auth-result?error=${encodeURIComponent('Authentication failed')}`, 'http://localhost:3000')
    );
  }
}
