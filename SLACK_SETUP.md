# Configuration de l'App Slack Starship - Mode Socket (Développement)

## 1. Créer l'Application Slack pour Socket Mode

### Étape 1: Accéder au Slack API Dashboard
1. Allez sur https://api.slack.com/apps
2. Connectez-vous avec votre compte Slack
3. Cliquez sur "Create New App"
4. Sélectionnez "From an app manifest"
5. Choisissez votre workspace de développement

### Étape 2: Configurer le Manifest pour Socket Mode
1. Copiez le contenu du fichier `slack-app-manifest-dev.json` (version simplifiée pour Socket Mode)
2. Collez le manifest et cliquez "Create"

**Note importante** : Ce manifest n'inclut pas d'URLs car Socket Mode ne les nécessite pas pour le développement local.

## 2. Récupérer les Tokens

### Basic Information (Settings > Basic Information)
- `Client ID` → Variable `SLACK_CLIENT_ID` (optionnel pour Socket Mode)
- `Client Secret` → Variable `SLACK_CLIENT_SECRET` (optionnel pour Socket Mode)
- `Signing Secret` → Variable `SLACK_SIGNING_SECRET`

### OAuth & Permissions (Features > OAuth & Permissions)
1. Installez l'app dans votre workspace (bouton "Install to Workspace")
2. Copiez le `Bot User OAuth Token` → Variable `SLACK_BOT_TOKEN`

### Socket Mode (Settings > Socket Mode) - **OBLIGATOIRE**
1. **Activez Socket Mode** (très important !)
2. Cliquez sur "Generate Token and Scopes"
3. Donnez un nom au token (ex: "starship-socket")
4. Ajoutez le scope `connections:write`
5. Cliquez "Generate"
6. Copiez le token → Variable `SLACK_APP_TOKEN`

## 3. Configuration Minimale pour Socket Mode

Remplissez le fichier `.env.local` avec ces tokens essentiels :

```env
# Tokens essentiels pour Socket Mode
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# Optionnel pour les tests complets
OPENAI_API_KEY=your-openai-api-key

# Configuration locale
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here
NODE_ENV=development
```

## 4. Test en Mode Socket

Une fois les variables configurées, testez l'app :

```bash
# Vérifier que les dépendances sont installées
npm install

# Lancer en mode Socket (développement)
npm run socket:dev
```

Vous devriez voir :
```
Starting Starship in Socket Mode...
⚡️ Starship Slack app is running in Socket Mode!
Environment check:
- SLACK_BOT_TOKEN: ✓ Set
- SLACK_APP_TOKEN: ✓ Set  
- SLACK_SIGNING_SECRET: ✓ Set
```

## 5. Commandes de Test

Dans votre workspace Slack :

### Test basique :
- Tapez `/ticket Test de création de ticket` 
- L'app devrait répondre (même si Jira n'est pas encore configuré)

### Test mention :
- Dans un canal où l'app est invitée, écrivez `@starship Hello`
- L'app devrait répondre à votre mention

## 6. Troubleshooting Socket Mode

### Erreurs communes :
- **"Socket connection failed"** : Vérifiez le `SLACK_APP_TOKEN`
- **"Invalid signing secret"** : Vérifiez le `SLACK_SIGNING_SECRET`
- **"Bot token invalid"** : Vérifiez le `SLACK_BOT_TOKEN` et que l'app est installée

### Si l'app ne répond pas :
1. Vérifiez que Socket Mode est activé dans les paramètres Slack
2. Vérifiez que l'app est installée dans votre workspace
3. Invitez l'app dans le canal : `/invite @starship`

### Logs de debug :
Le terminal affichera tous les événements reçus, ce qui vous aidera à déboguer.

## 7. Prochaines étapes

Une fois Socket Mode fonctionnel :
1. Configurez OpenAI pour l'analyse de conversations
2. Configurez Jira pour la création de tickets
3. Déployez sur Vercel pour la production
