import { App } from '@slack/bolt';

let slackApp;

if (!slackApp) {
  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: false, // Vercel doesn't support socket mode
  });
}

export default slackApp;
