require('dotenv').config();

console.log('🚀 Test des variables d\'environnement:');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✓ Défini' : '✗ Manquant');
console.log('SLACK_APP_TOKEN:', process.env.SLACK_APP_TOKEN ? '✓ Défini' : '✗ Manquant');
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✓ Défini' : '✗ Manquant');

if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN && process.env.SLACK_SIGNING_SECRET) {
  console.log('✅ Toutes les variables sont définies !');
  
  // Test de base avec Slack Bolt
  try {
    const { App, SocketModeReceiver } = require('@slack/bolt');
    
    const receiver = new SocketModeReceiver({
      appToken: process.env.SLACK_APP_TOKEN,
    });

    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      receiver,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    });

    // Test de commande simple
    app.command('/ticket', async ({ command, ack, respond }) => {
      await ack();
      console.log(`📝 Commande /ticket reçue: ${command.text}`);
      await respond(`✅ Ticket test reçu: "${command.text}"`);
    });

    // Test de mention
    app.event('app_mention', async ({ event, say }) => {
      console.log(`👋 Mention reçue: ${event.text}`);
      await say(`Salut <@${event.user}> ! Je suis Starship 🚀`);
    });

    app.start().then(() => {
      console.log('⚡️ Starship fonctionne en mode Socket !');
      console.log('Testez dans Slack:');
      console.log('- /ticket Mon premier test');
      console.log('- @starship hello');
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error.message);
  }
} else {
  console.log('❌ Variables d\'environnement manquantes');
}
