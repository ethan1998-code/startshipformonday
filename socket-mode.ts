import dotenv from 'dotenv';
import { SlackClient } from './src/lib/slack';
import { handleTicketCommand } from './src/handlers/ticket-command';
import { handleMention } from './src/handlers/mention';

// Load environment variables
dotenv.config();

// This file is for Socket Mode development
console.log('Starting Starship in Socket Mode...');

const slackClient = new SlackClient();
const app = slackClient.getApp();

// Register event handlers
app.command('/ticket', handleTicketCommand);
app.event('app_mention', handleMention);

// Handle interactive components (buttons)
app.action('create_jira_ticket', async ({ ack, body, respond }) => {
  await ack();
  console.log('Create ticket button clicked:', body);
  // Handle ticket creation from button click
  // Implementation would go here
});

app.action('modify_jira_ticket', async ({ ack, body, respond }) => {
  await ack();
  console.log('Modify ticket button clicked:', body);
  // Handle ticket modification modal
  // Implementation would go here
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Starship Slack app is running in Socket Mode!');
    console.log('Environment check:');
    console.log('- SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✓ Set' : '✗ Missing');
    console.log('- SLACK_APP_TOKEN:', process.env.SLACK_APP_TOKEN ? '✓ Set' : '✗ Missing');
    console.log('- SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✓ Set' : '✗ Missing');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing');
    console.log('- JIRA_CLIENT_ID:', process.env.JIRA_CLIENT_ID ? '✓ Set' : '✗ Missing');
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
})();
