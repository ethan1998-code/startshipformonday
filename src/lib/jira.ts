import axios, { AxiosResponse } from 'axios';
import { 
  JiraTicket, 
  JiraCreateTicketRequest, 
  JiraUser, 
  JiraProject, 
  JiraIssueType,
  JiraWorkspace,
  JiraOAuthTokens 
} from '@/types/jira';

export class JiraClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(endpoint: string, options: any = {}): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    
    try {
      const response: AxiosResponse<T> = await axios({
        url,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      return response.data;
    } catch (error: any) {
      console.error('Jira API Error:', error.response?.data || error.message);
      throw new Error(`Jira API request failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async createTicket(ticketData: JiraCreateTicketRequest): Promise<JiraTicket> {
    const payload = {
      fields: {
        project: { key: ticketData.projectKey },
        summary: ticketData.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description,
                },
              ],
            },
          ],
        },
        issuetype: { name: ticketData.issueType },
        ...(ticketData.assigneeAccountId && {
          assignee: { accountId: ticketData.assigneeAccountId },
        }),
        ...(ticketData.priority && {
          priority: { name: ticketData.priority },
        }),
      },
    };

    return await this.makeRequest<JiraTicket>('/issue', {
      method: 'POST',
      data: payload,
    });
  }

  async getTicket(ticketKey: string): Promise<JiraTicket> {
    return await this.makeRequest<JiraTicket>(`/issue/${ticketKey}`);
  }

  async searchUsers(query: string): Promise<JiraUser[]> {
    return await this.makeRequest<JiraUser[]>(`/user/search?query=${encodeURIComponent(query)}`);
  }

  async getUserByEmail(email: string): Promise<JiraUser | null> {
    try {
      const users = await this.makeRequest<JiraUser[]>(`/user/search?query=${encodeURIComponent(email)}`);
      return users.find(user => user.emailAddress === email) || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async getProjects(): Promise<JiraProject[]> {
    return await this.makeRequest<JiraProject[]>('/project');
  }

  async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
    const project = await this.makeRequest<any>(`/project/${projectKey}`);
    return project.issueTypes || [];
  }

  async assignTicket(ticketKey: string, assigneeAccountId: string): Promise<void> {
    await this.makeRequest(`/issue/${ticketKey}/assignee`, {
      method: 'PUT',
      data: { accountId: assigneeAccountId },
    });
  }
}

export class JiraOAuthManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.JIRA_CLIENT_ID!;
    this.clientSecret = process.env.JIRA_CLIENT_SECRET!;
    this.redirectUri = process.env.JIRA_REDIRECT_URI!;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.clientId,
      scope: 'read:jira-user read:jira-work write:jira-work manage:jira-project',
      redirect_uri: this.redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<JiraOAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      });

      const response = await axios.post('https://auth.atlassian.com/oauth/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Token exchange error:', error.response?.data || error.message);
      console.error('Client ID used:', this.clientId);
      console.error('Redirect URI used:', this.redirectUri);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  async refreshTokens(refreshToken: string): Promise<JiraOAuthTokens> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh tokens');
    }
  }

  async getAccessibleResources(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Get accessible resources error:', error.response?.data || error.message);
      throw new Error('Failed to get accessible resources');
    }
  }
}

// Simple in-memory storage for development - replace with database in production
const workspaces = new Map<string, JiraWorkspace>();

export const WorkspaceManager = {
  save: async (workspace: JiraWorkspace): Promise<void> => {
    workspaces.set(workspace.slackTeamId, workspace);
  },

  get: async (slackTeamId: string): Promise<JiraWorkspace | null> => {
    return workspaces.get(slackTeamId) || null;
  },

  delete: async (slackTeamId: string): Promise<void> => {
    workspaces.delete(slackTeamId);
  },
};
