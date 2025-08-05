import axios, { AxiosResponse } from 'axios';
import { 
  MondayItem, 
  MondayCreateItemRequest, 
  MondayUser, 
  MondayBoard,
  MondayWorkspace,
  MondayOAuthTokens 
} from '@/types/monday';

export class MondayClient {
  private apiUrl: string = 'https://api.monday.com/v2';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(query: string, variables: any = {}): Promise<T> {
    try {
      const response: AxiosResponse<{data: T, errors?: any[]}> = await axios({
        url: this.apiUrl,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          query,
          variables,
        },
      });

      if (response.data.errors) {
        throw new Error(`Monday.com API errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Monday.com API Error:', error.response?.data || error.message);
      throw new Error(`Monday.com API request failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async createItem(itemData: MondayCreateItemRequest): Promise<MondayItem> {
    const mutation = `
      mutation($boardId: ID!, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
          board {
            id
            name
          }
          created_at
        }
      }
    `;

    const variables = {
      boardId: itemData.boardId,
      itemName: itemData.itemName,
      columnValues: itemData.columnValues ? JSON.stringify(itemData.columnValues) : undefined,
    };

    const result = await this.makeRequest<{create_item: MondayItem}>(mutation, variables);
    return result.create_item;
  }

  async getItem(itemId: string): Promise<MondayItem> {
    const query = `
      query($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          board {
            id
            name
          }
          column_values {
            id
            value
            text
            type
          }
          created_at
          updated_at
        }
      }
    `;

    const result = await this.makeRequest<{items: MondayItem[]}>(query, { itemId });
    return result.items[0];
  }

  async getMe(): Promise<MondayUser> {
    const query = `
      query {
        me {
          id
          name
          email
          photo_original
          enabled
          created_at
        }
      }
    `;

    const result = await this.makeRequest<{me: MondayUser}>(query);
    return result.me;
  }

  async getBoards(limit: number = 25): Promise<MondayBoard[]> {
    const query = `
      query($limit: Int) {
        boards(limit: $limit) {
          id
          name
          description
          state
          items_count
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

    const result = await this.makeRequest<{boards: MondayBoard[]}>(query, { limit });
    return result.boards;
  }
}

export class MondayOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      ...(state && { state }),
    });

    return `https://auth.monday.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<MondayOAuthTokens> {
    try {
      const response = await axios.post('https://auth.monday.com/oauth2/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('OAuth token exchange error:', error.response?.data || error.message);
      throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }
}

// Simple in-memory storage for workspaces (in production, use a real database)
const workspaces = new Map<string, MondayWorkspace>();

export const WorkspaceManager = {
  save: async (workspace: MondayWorkspace): Promise<void> => {
    workspaces.set(workspace.teamId, workspace);
    console.log(`💾 Workspace saved for team ${workspace.teamId}`);
  },

  get: async (slackTeamId: string): Promise<MondayWorkspace | null> => {
    return workspaces.get(slackTeamId) || null;
  },

  delete: async (slackTeamId: string): Promise<void> => {
    workspaces.delete(slackTeamId);
    console.log(`🗑️ Workspace deleted for team ${slackTeamId}`);
  },
};

export default MondayClient;
