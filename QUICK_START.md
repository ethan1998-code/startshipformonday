# 🚀 Quick Start - Starship Socket Mode

## Étapes rapides pour tester Starship en mode Socket

### 1. Configuration Slack (5 minutes)

1. **Créer l'app** : https://api.slack.com/apps → "Create New App" → "From an app manifest"
2. **Utiliser le manifest** : Copiez le contenu de `slack-app-manifest-dev.json`
3. **Installer l'app** : OAuth & Permissions → "Install to Workspace"
4. **Activer Socket Mode** : Settings → Socket Mode → ON
5. **Créer App Token** : Generate Token → scope `connections:write`

### 2. Variables d'environnement (2 minutes)

Remplissez `.env.local` avec vos 3 tokens essentiels :

```env
SLACK_BOT_TOKEN=xoxb-VOTRE-TOKEN-ICI
SLACK_APP_TOKEN=xapp-VOTRE-TOKEN-ICI  
SLACK_SIGNING_SECRET=VOTRE-SECRET-ICI
```

### 3. Démarrer l'app (1 minute)

```bash
# Installer les dépendances (si pas encore fait)
npm install

# Lancer en mode Socket
npm run socket:dev
```

### 4. Tester (30 secondes)

Dans Slack :
- `/ticket Mon premier test` 
- `@starship hello` (dans un canal où l'app est invitée)

## ✅ Ce qui devrait fonctionner

- [x] L'app répond aux commandes `/ticket`
- [x] L'app répond aux mentions `@starship`
- [x] Vous voyez les logs dans le terminal

## ❌ Ce qui ne fonctionnera pas encore (normal)

- [ ] Création de tickets Jira (pas encore configuré)
- [ ] Analyse OpenAI (pas encore configuré)
- [ ] Images (nécessite OpenAI)

## 🔧 Problèmes courants

**L'app ne répond pas ?**
1. Vérifiez que Socket Mode est activé
2. Invitez l'app : `/invite @starship`
3. Vérifiez les tokens dans `.env.local`

**Erreur de connexion ?**
- Vérifiez le `SLACK_APP_TOKEN`
- Redémarrez avec `npm run socket:dev`

## 📱 Commandes disponibles

- `/ticket [texte]` - Créer un ticket (simulé)
- `@starship [texte]` - Analyser une conversation (simulé)
- `@starship assign to [user]` - Test d'assignation

Une fois que ça marche, vous pourrez ajouter OpenAI et Jira ! 🎉
