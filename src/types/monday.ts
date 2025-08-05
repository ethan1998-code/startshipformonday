export interface MondayItem {
  id: string;
  name: string;
  board: {
    id: string;
    name: string;
  };
  column_values?: Array<{
    id: string;
    value: string;
    text: string;
    type: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface MondayCreateItemRequest {
  boardId: string;
  itemName: string;
  columnValues?: Record<string, any>;
}

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  state: string;
  items_count: number;
  columns?: Array<{
    id: string;
    title: string;
    type: string;
    settings_str?: string;
  }>;
}

export interface MondayUser {
  id: string;
  name: string;
  email: string;
  photo_original?: string;
  enabled: boolean;
  created_at: string;
}

export interface MondayWorkspace {
  id: string;
  teamId: string;
  mondayUserId: string;
  accessToken: string;
  refreshToken?: string;
  defaultBoardId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MondayOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}
