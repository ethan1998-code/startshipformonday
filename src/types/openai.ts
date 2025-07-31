export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | OpenAIContent[];
}

export interface OpenAIContent {
  type: 'text' | 'image_url';
  text: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface JiraTaskAnalysis {
  summary: string;
  description: string;
  priority: 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest';
  issueType: 'Task' | 'Bug' | 'Story' | 'Epic' | 'Subtask';
  acceptanceCriteria: string[];
  estimatedStoryPoints?: number;
}

export interface ConversationAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  participants: string[];
  hasImages: boolean;
  imageDescriptions: string[];
  suggestedJiraTask: JiraTaskAnalysis;
}
