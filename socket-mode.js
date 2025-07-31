import { SlackClient } from './src/lib/slack';
import { handleTicketCommand } from './src/handlers/ticket-command';
import { handleMention } from './src/handlers/mention';

// This file is for Socket Mode development
// Run with: node socket-mode.js

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
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
})();
