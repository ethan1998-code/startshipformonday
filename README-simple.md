# 🚀 Starship - Assistant Slack IA pour Jira

Assistant intelligent qui analyse les conversations Slack et crée automatiquement des tickets Jira avec des Definition of Done professionnelles.

## ✨ Fonctionnalités

- **`/ticket`** : Création rapide de tickets Jira  
- **`@starship`** : Analyse IA des conversations et création de tickets intelligents
- **Intégration OpenAI GPT-4** : Génération de DoD comme un Product Manager
- **Interface Slack moderne** : Blocs interactifs et boutons d'action

## 🚀 Démarrage rapide

### 1. Installation
```bash
npm install
```

### 2. Configuration
Copiez `.env.example` vers `.env.local` et configurez :
```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# Jira
JIRA_BASE_URL=https://votre-domain.atlassian.net
JIRA_API_TOKEN=...
JIRA_EMAIL=...
JIRA_PROJECT_KEY=...

# OpenAI
OPENAI_API_KEY=sk-...
```

### 3. Démarrage

**Mode développement (Socket Mode) :**
```bash
npm run socket
```

**Mode production (Next.js + Vercel) :**
```bash
npm run build
npm start
```

## 📋 Usage

### Commande `/ticket`
```
/ticket Corriger le bug de connexion
```
Crée un ticket Jira simple avec interface moderne.

### Mention `@starship`
Mentionnez `@starship` dans un thread de discussion pour :
- Analyser l'historique complet de la conversation
- Générer un titre pertinent
- Créer une Definition of Done professionnelle
- Formater comme un Product Manager expérimenté

## 🛠️ Architecture

- **starship.js** : Application principale (Socket Mode)
- **src/app/api/** : Routes Next.js pour Vercel
- **slack-app-manifest-simple.json** : Configuration Slack

## 📦 Déploiement

Le projet est configuré pour Vercel avec Next.js en production et Socket Mode en développement.

## 🤖 IA Features

- Analyse OpenAI GPT-4 des conversations
- Génération automatique de titres pertinents  
- Definition of Done structurée avec checkboxes
- Critères d'acceptation spécifiques
- Métadonnées automatiques (timestamps, utilisateurs)

---
*Powered by OpenAI GPT-4, @slack/bolt, et Next.js*
