export interface JiraTicket {
  key: string;
  id: string;
  summary: string;
  description: string;
  status: {
    name: string;
    id: string;
  };
  assignee?: {
    accountId: string;
    displayName: string;
    emailAddress: string;
  };
  reporter: {
    accountId: string;
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
}

export interface JiraCreateTicketRequest {
  summary: string;
  description: string;
  projectKey: string;
  issueType: string;
  assigneeAccountId?: string;
  priority?: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
}

export interface JiraOAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface JiraWorkspace {
  slackTeamId: string;
  jiraCloudId: string;
  jiraBaseUrl: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  defaultProjectKey?: string;
}
