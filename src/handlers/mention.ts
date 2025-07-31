import { SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { SlackClient } from '@/lib/slack';
import { OpenAIClient } from '@/lib/openai';
import { JiraClient, WorkspaceManager } from '@/lib/jira';
import { StarshipMentionContext } from '@/types/slack';

export async function handleMention(
  { event, say }: SlackEventMiddlewareArgs<'app_mention'> & AllMiddlewareArgs
) {
  try {
    const slackClient = new SlackClient();
    
    // Add thinking reaction
    await slackClient.addReaction(event.channel, event.ts, 'thinking_face');

    // Get workspace configuration
    const workspace = await WorkspaceManager.get(event.team || '');
    if (!workspace) {
      await say({
        text: '❌ Jira integration not configured. Please ask an admin to set up the Jira connection.',
        thread_ts: event.ts,
      });
      return;
    }

    // Extract mention context
    const { cleanText, assignTo } = slackClient.extractMentionContext(event.text);
    
    // Get thread messages if this is in a thread
    let threadMessages = [];
    let allFiles = [];

    if (event.thread_ts) {
      threadMessages = await slackClient.getThreadMessages(event.channel, event.thread_ts);
    } else {
      // If not in thread, use the current message
      threadMessages = [{
        user: event.user || 'unknown',
        text: cleanText,
        ts: event.ts,
        thread_ts: event.ts,
        files: (event.files as any[]) || [],
      }];
    }

    // Collect all files from the thread
    for (const message of threadMessages) {
      if (message.files) {
        allFiles.push(...message.files);
      }
    }

    // Analyze conversation with OpenAI
    const openaiClient = new OpenAIClient();
    const analysis = await openaiClient.analyzeConversation(
      threadMessages,
      allFiles,
      cleanText
    );

    // Create Jira client
    const jiraClient = new JiraClient(workspace.jiraBaseUrl, workspace.accessToken);

    // Handle assignment if specified
    let assigneeAccountId: string | undefined;
    if (assignTo) {
      // Try to find user by email or username
      const jiraUser = await jiraClient.getUserByEmail(assignTo) || 
                      await jiraClient.searchUsers(assignTo).then(users => users[0]);
      
      if (jiraUser) {
        assigneeAccountId = jiraUser.accountId;
      } else {
        await say({
          text: `⚠️ Could not find Jira user "${assignTo}". Proceeding without assignment.`,
          thread_ts: event.thread_ts || event.ts,
        });
      }
    }

    // Generate detailed description
    const detailedDescription = await openaiClient.generateTicketDescription(analysis);

    // Create the ticket
    const ticket = await jiraClient.createTicket({
      summary: analysis.suggestedJiraTask.summary,
      description: detailedDescription,
      projectKey: workspace.defaultProjectKey || 'PROJ',
      issueType: analysis.suggestedJiraTask.issueType,
      priority: analysis.suggestedJiraTask.priority,
      assigneeAccountId,
    });

    // Remove thinking reaction and add success reaction
    await slackClient.addReaction(event.channel, event.ts, 'white_check_mark');

    // Send success message
    const successBlocks = slackClient.formatJiraTicketMessage(
      ticket.key,
      ticket.summary,
      workspace.jiraBaseUrl
    );

    // Add analysis details to the blocks
    const analysisSection = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*AI Analysis:* ${analysis.summary}\n*Participants:* ${analysis.participants.join(', ')}${assignTo ? `\n*Assigned to:* ${assignTo}` : ''}`,
      },
    };

    successBlocks.splice(1, 0, analysisSection);

    await say({
      blocks: successBlocks,
      text: `✅ Jira ticket ${ticket.key} created successfully!`,
      thread_ts: event.thread_ts || event.ts,
    });

    // If there were images, mention that they were analyzed
    if (allFiles.length > 0) {
      await say({
        text: `📸 Analyzed ${allFiles.length} image(s) from the conversation for additional context.`,
        thread_ts: event.thread_ts || event.ts,
      });
    }

  } catch (error) {
    console.error('Error handling mention:', error);

    const slackClient = new SlackClient();
    const errorBlocks = slackClient.formatErrorMessage(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );

    await say({
      blocks: errorBlocks,
      text: '❌ Error processing request',
      thread_ts: event.thread_ts || event.ts,
    });
  }
}
