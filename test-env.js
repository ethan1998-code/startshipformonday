require('dotenv').config();

console.log('🔧 Test des variables d\'environnement:');
console.log('JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
console.log('JIRA_CLIENT_ID:', process.env.JIRA_CLIENT_ID ? '✓ Défini' : '✗ Manquant');
console.log('JIRA_CLIENT_SECRET:', process.env.JIRA_CLIENT_SECRET ? '✓ Défini' : '✗ Manquant');
console.log('JIRA_REDIRECT_URI:', process.env.JIRA_REDIRECT_URI);

if (process.env.JIRA_CLIENT_ID) {
  console.log('✅ Toutes les variables Jira sont définies !');
  
  // Test de génération d'URL d'auth
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.JIRA_CLIENT_ID,
    scope: 'read:jira-user read:jira-work write:jira-work',
    redirect_uri: process.env.JIRA_REDIRECT_URI,
    state: 'test',
    response_type: 'code',
    prompt: 'consent',
  });
  
  console.log('\n🔗 URL d\'authentification générée:');
  console.log(`https://auth.atlassian.com/authorize?${params.toString()}`);
} else {
  console.log('❌ Variables manquantes !');
}
