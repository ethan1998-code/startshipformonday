import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { MondayClient, WorkspaceManager } from '@/lib/monday';
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
        text: '❌ Monday.com integration not configured. Please ask an admin to set up the Monday.com connection.',
      });
      return;
    }

    // Parse command text
    const text = command.text.trim();
    if (!text) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Please provide an item summary. Usage: `/ticket Your item summary here`',
      });
      return;
    }

    // Create Monday.com client
    const mondayClient = new MondayClient(workspace.accessToken);

    // Create basic item
    const item = await mondayClient.createItem({
      boardId: workspace.defaultBoardId || 'default_board',
      itemName: text,
      columnValues: {
        description: `Item created from Slack by <@${command.user_id}>\n\nChannel: <#${command.channel_id}>`,
      },
    });

    // Send success response
    const slackClient = new SlackClient();
    const blocks = slackClient.formatMondayItemMessage(
      item.id,
      item.name,
      item.board.id
    );

    await respond({
      response_type: 'in_channel',
      blocks,
      text: `✅ Monday.com item ${item.id} created successfully!`,
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
