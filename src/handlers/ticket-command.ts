import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { JiraClient, WorkspaceManager } from '@/lib/jira';
import { SlackClient } from '@/lib/slack';

export async function handleTicketCommand(
  { command, ack, respond }: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  await ack();

  try {
    // Get workspace configuration
    const workspace = await WorkspaceManager.get(command.team_id);
    if (!workspace) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Jira integration not configured. Please ask an admin to set up the Jira connection.',
      });
      return;
    }

    // Parse command text
    const text = command.text.trim();
    if (!text) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Please provide a ticket summary. Usage: `/ticket Your ticket summary here`',
      });
      return;
    }

    // Create Jira client
    const jiraClient = new JiraClient(workspace.jiraBaseUrl, workspace.accessToken);

    // Create basic ticket
    const ticket = await jiraClient.createTicket({
      summary: text,
      description: `Ticket created from Slack by <@${command.user_id}>\n\nChannel: <#${command.channel_id}>`,
      projectKey: workspace.defaultProjectKey || 'PROJ',
      issueType: 'Task',
    });

    // Send success response
    const slackClient = new SlackClient();
    const blocks = slackClient.formatJiraTicketMessage(
      ticket.key,
      ticket.summary,
      workspace.jiraBaseUrl
    );

    await respond({
      response_type: 'in_channel',
      blocks,
      text: `✅ Jira ticket ${ticket.key} created successfully!`,
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    
    const slackClient = new SlackClient();
    const blocks = slackClient.formatErrorMessage(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );

    await respond({
      response_type: 'ephemeral',
      blocks,
      text: '❌ Error creating ticket',
    });
  }
}
