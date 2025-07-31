require('dotenv').config();

console.log('🔧 Test de configuration Jira');
console.log('JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
console.log('JIRA_CLIENT_ID:', process.env.JIRA_CLIENT_ID ? '✓ Défini' : '✗ Manquant');
console.log('JIRA_CLIENT_SECRET:', process.env.JIRA_CLIENT_SECRET ? '✓ Défini' : '✗ Manquant');

if (process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET && process.env.JIRA_BASE_URL) {
  console.log('✅ Configuration Jira complète !');
  
  // Test de base de l'URL d'authentification
  const authUrl = `https://auth.atlassian.com/authorize?` +
    `audience=api.atlassian.com&` +
    `client_id=${process.env.JIRA_CLIENT_ID}&` +
    `scope=read:jira-user read:jira-work write:jira-work&` +
    `redirect_uri=${encodeURIComponent(process.env.JIRA_REDIRECT_URI)}&` +
    `state=test&` +
    `response_type=code&` +
    `prompt=consent`;
  
  console.log('\n🔗 URL d\'authentification Jira:');
  console.log(authUrl);
  console.log('\n📝 Prochaine étape: Ouvrir cette URL pour autoriser l\'accès à Jira');
} else {
  console.log('❌ Configuration Jira incomplète');
  console.log('\nPour configurer Jira:');
  console.log('1. Allez sur https://developer.atlassian.com/console/myapps/');
  console.log('2. Créez une app OAuth 2.0');
  console.log('3. Ajoutez les informations dans .env');
}
