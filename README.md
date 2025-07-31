# 🚀 Starship - AI-Powered Slack to Jira Integration

Starship is an intelligent Slack bot that seamlessly integrates with Jira and leverages OpenAI to streamline your project management workflow.

## ✨ Features

- **Quick Ticket Creation**: Use `/ticket [summary]` to instantly create Jira tickets
- **AI-Powered Analysis**: Mention `@starship` in threads to analyze conversations and generate structured Jira tasks
- **Image Analysis**: Upload screenshots and images - Starship analyzes them for additional context
- **Smart Assignment**: Use `@starship assign to [username]` to assign tickets to team members
- **DOD Generation**: Automatically creates Definition of Done based on conversation context
- **OAuth Integration**: Secure Jira authentication with OAuth 3.0

## 🏗️ Architecture

- **Framework**: Next.js with TypeScript
- **Slack Integration**: @slack/bolt framework
- **AI**: OpenAI GPT-4 with vision capabilities
- **Jira**: REST API with OAuth 3.0
- **Deployment**: Vercel-optimized
- **Development**: Socket Mode support for local testing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Slack workspace with admin permissions
- Jira Cloud instance
- OpenAI API key
- Vercel account (for deployment)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
# Slack App Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # For Socket Mode only
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_REDIRECT_URI=https://your-app.vercel.app/api/jira/callback

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Next.js Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/starship.git
cd starship
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

### Development with Socket Mode

For local development, use Socket Mode:

```bash
# Start in Socket Mode
npm run socket:dev
```

### Production Deployment

Deploy to Vercel:

```bash
# Build the application
npm run build

# Deploy to Vercel
vercel deploy
```

## 🔧 Slack App Setup

### 1. Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From an app manifest"
3. Use the manifest from `slack-app-manifest.example.json`
4. Replace `your-app.vercel.app` with your actual domain

### 2. Configure OAuth & Permissions

Required OAuth scopes:
- `app_mentions:read`
- `channels:history`
- `chat:write`
- `commands`
- `files:read`
- `groups:history`
- `im:history`
- `mpim:history`
- `reactions:write`
- `users:read`
- `users:read.email`

### 3. Event Subscriptions

- Request URL: `https://your-app.vercel.app/api/slack/events`
- Subscribe to bot events:
  - `app_mention`
  - `message.channels`
  - `message.groups`
  - `message.im`
  - `message.mpim`

### 4. Slash Commands

- Command: `/ticket`
- Request URL: `https://your-app.vercel.app/api/slack/events`
- Description: "Create a new Jira ticket"

## 🔗 Jira Setup

### 1. Create OAuth App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create new app
3. Add OAuth 2.0 (3LO) capability
4. Set callback URL: `https://your-app.vercel.app/api/jira/callback`
5. Add scopes:
   - `read:jira-user`
   - `read:jira-work`
   - `write:jira-work`
   - `manage:jira-project`

### 2. Connect to Slack

1. Install Starship in your Slack workspace
2. Run `/ticket test` to initiate Jira connection
3. Complete OAuth flow when prompted

## 📖 Usage

### Creating Tickets

**Quick Creation:**
```
/ticket Fix login button styling
```

**AI-Powered Creation:**
1. Have a conversation in a Slack thread
2. Add screenshots if needed
3. Mention `@starship` to analyze and create ticket

**With Assignment:**
```
@starship assign to john.doe
```

### Example Conversation

```
User1: The checkout button is broken on mobile
User2: Yeah, it's not clickable on iOS Safari
User1: [uploads screenshot]
User3: @starship assign to frontend-team
```

Starship will:
1. Analyze the conversation and image
2. Generate a structured Jira ticket with DOD
3. Assign to the specified team member
4. Create acceptance criteria based on the discussion

## 🔧 API Routes

- `POST /api/slack/events` - Slack events and commands
- `GET /api/jira/auth` - Initiate Jira OAuth
- `GET /api/jira/callback` - Handle OAuth callback
- `GET /auth-result` - OAuth result page

## 🧪 Testing

### Socket Mode Testing

```bash
npm run socket:dev
```

### Production Testing

```bash
npm run build
npm start
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set all required environment variables in your Vercel project settings.

## 🔒 Security

- All sensitive data is handled through environment variables
- OAuth 3.0 for secure Jira authentication
- Slack request signing verification
- No credentials stored in code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- Check the [Issues](https://github.com/your-username/starship/issues) page
- Join our [Slack workspace](https://slack-link.com) for support
- Email: support@starship-app.com

## 🚀 Roadmap

- [ ] Multi-project support
- [ ] Custom field mapping
- [ ] Advanced AI prompts customization
- [ ] Integration with GitHub
- [ ] Workflow automation
- [ ] Analytics dashboard
