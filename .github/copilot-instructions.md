<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Starship Slack App - Copilot Instructions

This is a Slack application built with Next.js and TypeScript that integrates with Jira and OpenAI APIs.

## Project Structure
- **Slack Integration**: Using @slack/bolt framework for handling events, commands, and OAuth
- **Jira Integration**: REST API integration with OAuth 3.0 authentication
- **OpenAI Integration**: GPT-4 with vision capabilities for analyzing thread conversations and images
- **Deployment**: Configured for Vercel with Next.js API routes

## Key Features to Implement
1. `/ticket` slash command for creating Jira tickets
2. `@starship` mentions in threads for AI-powered task creation
3. Image analysis using OpenAI Vision API
4. User assignment functionality for Jira tickets
5. OAuth flow for Jira integration
6. Socket Mode support for development

## Code Guidelines
- Use TypeScript for all files
- Follow Next.js App Router structure
- Implement proper error handling for all API calls
- Use environment variables for all sensitive data
- Follow Slack app best practices for OAuth and security
- Ensure compatibility with Vercel deployment
