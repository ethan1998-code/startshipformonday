# Starship - HTTP Mode for Vercel Deployment

## 🚀 Configuration Changes for Vercel

### Mode HTTP vs Socket Mode
- **Socket Mode** (développement) → Connexion WebSocket persistante
- **HTTP Mode** (production) → Requêtes HTTP via webhooks

### Files Created/Modified:
- `api/slack.js` → Main Vercel serverless function
- `api/slack/events.js` → Events handler  
- `api/slack/commands.js` → Commands handler
- `vercel.json` → Vercel configuration for HTTP mode
- `starship.js` → Modified for HTTP mode (no socket, export app)

### Environment Variables for Vercel:
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your-jira-token
JIRA_PROJECT_KEY=AL
JIRA_ISSUE_TYPE=Task
```

### Slack App Configuration Changes:
1. **Request URL**: `https://your-vercel-app.vercel.app/api/slack`
2. **Slash Commands**: Same URL 
3. **Event Subscriptions**: Same URL
4. **Remove Socket Mode**: Disable in Slack app settings

### Deployment:
```bash
npm run vercel
```

### Local Testing:
```bash
npm run vercel-dev
```
