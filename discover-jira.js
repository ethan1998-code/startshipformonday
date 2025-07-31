require('dotenv').config();
const axios = require('axios');

// Configuration depuis .env.local
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const ACCESS_TOKEN = 'TOKEN_A_REMPLACER'; // On va le remplacer avec le vrai token

console.log('🔍 Découverte des projets Jira disponibles...');
console.log('Base URL:', JIRA_BASE_URL);

async function discoverJiraProjects() {
  if (!JIRA_BASE_URL) {
    console.log('❌ JIRA_BASE_URL manquant');
    return;
  }

  console.log('\n📋 Pour obtenir votre token d\'accès:');
  console.log('1. Allez dans votre Jira:', JIRA_BASE_URL);
  console.log('2. Paramètres -> Apps -> API tokens');
  console.log('3. Créez un nouveau token');
  console.log('4. Remplacez TOKEN_A_REMPLACER dans ce script');
  
  if (ACCESS_TOKEN === 'TOKEN_A_REMPLACER') {
    console.log('\n⚠️  Configurez d\'abord votre token d\'accès Jira');
    return;
  }

  try {
    // Récupérer tous les projets
    const projectsResponse = await axios.get(`${JIRA_BASE_URL}/rest/api/3/project`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    console.log('\n🎯 Projets Jira disponibles:');
    projectsResponse.data.forEach((project, index) => {
      console.log(`${index + 1}. ${project.key} - ${project.name}`);
      console.log(`   URL: ${project.self}`);
    });

    // Récupérer les types de tickets pour le premier projet
    if (projectsResponse.data.length > 0) {
      const firstProject = projectsResponse.data[0];
      console.log(`\n🎫 Types de tickets disponibles pour ${firstProject.key}:`);
      
      const issueTypesResponse = await axios.get(
        `${JIRA_BASE_URL}/rest/api/3/issuetype/project?projectId=${firstProject.id}`,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Accept': 'application/json',
          },
        }
      );

      issueTypesResponse.data.forEach((issueType, index) => {
        console.log(`${index + 1}. ${issueType.id} - ${issueType.name} (${issueType.description || 'Pas de description'})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

discoverJiraProjects();
