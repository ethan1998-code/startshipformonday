const { installUrl } = require('@slack/oauth');

const clientId = process.env.SLACK_CLIENT_ID;
const scopes = [
  'commands',
  'chat:write',
  'app_mentions:read',
  // ajoute d’autres scopes si besoin
];
const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI; // ex: https://tondomaine.com/slack/oauth/callback

// Génère l'URL d'installation
const url = installUrl({
  clientId,
  scopes,
  redirectUri,
  // state: 'optionnel-pour-la-sécurité'
});

console.log('Slack OAuth URL:', url);