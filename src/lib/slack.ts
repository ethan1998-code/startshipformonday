import { App, SocketModeReceiver } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { 
  SlackUser, 
  SlackMessage, 
  SlackThreadMessage, 
  SlackFile, 
  StarshipMentionContext 
} from '@/types/slack';

export class SlackClient {
  private app: App;
  private client: WebClient;

  constructor() {
    // For Socket Mode (development)
    if (process.env.SLACK_APP_TOKEN) {
      const receiver = new SocketModeReceiver({
        appToken: process.env.SLACK_APP_TOKEN,
      });

      this.app = new App({
        token: process.env.SLACK_BOT_TOKEN,
        receiver,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
      });
    } else {
      // For HTTP mode (production)
      this.app = new App({
        token: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
      });
    }

    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  getApp(): App {
    return this.app;
  }

  async getUser(userId: string): Promise<SlackUser | null> {
    try {
      const result = await this.client.users.info({ user: userId });
      if (result.ok && result.user) {
        return result.user as SlackUser;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<SlackUser | null> {
    try {
      const result = await this.client.users.lookupByEmail({ email });
      if (result.ok && result.user) {
        return result.user as SlackUser;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  async getThreadMessages(channel: string, threadTs: string): Promise<SlackThreadMessage[]> {
    try {
      const result = await this.client.conversations.replies({
        channel,
        ts: threadTs,
        inclusive: true,
      });

      if (result.ok && result.messages) {
        return result.messages.map(msg => ({
          user: msg.user || 'unknown',
          text: msg.text || '',
          ts: msg.ts || '',
          thread_ts: threadTs,
          files: msg.files as SlackFile[] || [],
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      return [];
    }
  }

  async getFileInfo(fileId: string): Promise<SlackFile | null> {
    try {
      const result = await this.client.files.info({ file: fileId });
      if (result.ok && result.file) {
        return result.file as SlackFile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching file info:', error);
      return null;
    }
  }

  async downloadFile(file: SlackFile): Promise<Buffer | null> {
    try {
      const response = await fetch(file.url_private_download, {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      });

      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
      return null;
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  async sendMessage(channel: string, text: string, threadTs?: string): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel,
        text,
        thread_ts: threadTs,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendBlockMessage(channel: string, blocks: any[], text?: string, threadTs?: string): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel,
        blocks,
        text: text || 'Starship notification',
        thread_ts: threadTs,
      });
    } catch (error) {
      console.error('Error sending block message:', error);
      throw error;
    }
  }

  async sendEphemeralMessage(channel: string, user: string, text: string, blocks?: any[]): Promise<void> {
    try {
      await this.client.chat.postEphemeral({
        channel,
        user,
        text,
        blocks,
      });
    } catch (error) {
      console.error('Error sending ephemeral message:', error);
      throw error;
    }
  }

  async addReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    try {
      await this.client.reactions.add({
        channel,
        timestamp,
        name: emoji,
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  async updateMessage(channel: string, ts: string, text: string, blocks?: any[]): Promise<void> {
    try {
      await this.client.chat.update({
        channel,
        ts,
        text,
        blocks,
      });
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  extractMentionContext(text: string): { cleanText: string; assignTo?: string } {
    // Remove the bot mention
    let cleanText = text.replace(/<@[UW][A-Z0-9]+>/g, '').trim();
    
    // Look for assignment patterns
    const assignPatterns = [
      /assign\s+to\s+([a-zA-Z0-9._-]+)/i,
      /assign\s+([a-zA-Z0-9._-]+)/i,
      /@([a-zA-Z0-9._-]+)/g,
    ];

    let assignTo: string | undefined;

    for (const pattern of assignPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        assignTo = match[1];
        cleanText = cleanText.replace(match[0], '').trim();
        break;
      }
    }

    return { cleanText, assignTo };
  }

  formatJiraTicketMessage(ticketKey: string, summary: string, jiraBaseUrl: string): any[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Jira ticket created successfully!*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket:* <${jiraBaseUrl}/browse/${ticketKey}|${ticketKey}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Summary:* ${summary}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Created by Starship 🚀`,
          },
        ],
      },
    ];
  }

  formatMondayItemMessage(itemId: string, itemName: string, boardId: string): any[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Monday.com item created successfully!*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Item ID:* ${itemId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Name:* ${itemName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Board ID:* ${boardId}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Created by Starship for Monday.com 🚀`,
          },
        ],
      },
    ];
  }

  formatErrorMessage(error: string): any[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Error creating ticket*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${error}\`\`\``,
        },
      },
    ];
  }

  formatAnalysisMessage(analysis: any): any[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🤖 *Conversation Analysis*\n\n*Summary:* ${analysis.summary}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Key Points:*\n${analysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}`,
          },
          {
            type: 'mrkdwn',
            text: `*Participants:* ${analysis.participants.join(', ')}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Suggested Jira Ticket:*\n*Title:* ${analysis.suggestedJiraTask.summary}\n*Type:* ${analysis.suggestedJiraTask.issueType}\n*Priority:* ${analysis.suggestedJiraTask.priority}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Create Ticket',
            },
            style: 'primary',
            action_id: 'create_jira_ticket',
            value: JSON.stringify(analysis.suggestedJiraTask),
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Modify & Create',
            },
            action_id: 'modify_jira_ticket',
            value: JSON.stringify(analysis.suggestedJiraTask),
          },
        ],
      },
    ];
  }
}
