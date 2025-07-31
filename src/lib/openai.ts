import OpenAI from 'openai';
import { 
  OpenAIMessage, 
  OpenAIContent, 
  ConversationAnalysis, 
  JiraTaskAnalysis 
} from '@/types/openai';
import { SlackThreadMessage, SlackFile } from '@/types/slack';

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeConversation(
    messages: SlackThreadMessage[],
    files: SlackFile[],
    context?: string
  ): Promise<ConversationAnalysis> {
    try {
      const systemPrompt = `You are Starship, an AI assistant that analyzes Slack conversations to create Jira tickets. 
      
      Your task is to:
      1. Analyze the conversation thread
      2. Identify the main issue or request
      3. Extract key requirements and details
      4. Suggest a well-structured Jira ticket with proper Definition of Done (DoD)
      5. Analyze any images provided for additional context
      
      Focus on creating actionable, specific tickets with clear acceptance criteria.`;

      const userContent: any[] = [
        {
          type: 'text',
          text: `Please analyze this Slack conversation and suggest a Jira ticket:

${context ? `Context: ${context}\n` : ''}

Conversation:
${messages.map(msg => `${msg.user}: ${msg.text}`).join('\n')}

${files.length > 0 ? `\nImages attached: ${files.length}` : ''}

Please provide a structured analysis and Jira ticket suggestion.`,
        },
      ];

      // Add images to the analysis
      for (const file of files) {
        if (file.mimetype?.startsWith('image/')) {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: file.url_private,
              detail: 'high',
            },
          });
        }
      }

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseAnalysisResponse(response, messages, files);
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      throw new Error(`Failed to analyze conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseAnalysisResponse(
    response: string,
    messages: SlackThreadMessage[],
    files: SlackFile[]
  ): ConversationAnalysis {
    // This is a simplified parser - in production, you might want to use
    // structured output or more sophisticated parsing
    
    const lines = response.split('\n');
    let summary = '';
    let keyPoints: string[] = [];
    let actionItems: string[] = [];
    let acceptanceCriteria: string[] = [];
    let description = '';
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('summary') || trimmedLine.toLowerCase().includes('title')) {
        currentSection = 'summary';
        const match = trimmedLine.match(/[:.-]\s*(.+)/);
        if (match) summary = match[1];
      } else if (trimmedLine.toLowerCase().includes('key points') || trimmedLine.toLowerCase().includes('requirements')) {
        currentSection = 'keyPoints';
      } else if (trimmedLine.toLowerCase().includes('action items') || trimmedLine.toLowerCase().includes('tasks')) {
        currentSection = 'actionItems';
      } else if (trimmedLine.toLowerCase().includes('acceptance criteria') || trimmedLine.toLowerCase().includes('definition of done')) {
        currentSection = 'acceptanceCriteria';
      } else if (trimmedLine.toLowerCase().includes('description')) {
        currentSection = 'description';
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.match(/^\d+\./)) {
        const item = trimmedLine.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
        if (currentSection === 'keyPoints') keyPoints.push(item);
        else if (currentSection === 'actionItems') actionItems.push(item);
        else if (currentSection === 'acceptanceCriteria') acceptanceCriteria.push(item);
      } else if (trimmedLine && currentSection === 'description') {
        description += trimmedLine + ' ';
      }
    }

    // Fallback parsing if structured format isn't detected
    if (!summary) {
      summary = lines.find(line => line.trim().length > 10 && !line.includes(':'))?.trim() || 'Task from Slack conversation';
    }

    if (!description) {
      description = messages.map(msg => msg.text).join(' ').substring(0, 500);
    }

    if (acceptanceCriteria.length === 0) {
      acceptanceCriteria = [
        'Requirements are clearly documented',
        'Solution is implemented and tested',
        'Changes are reviewed and approved',
      ];
    }

    const suggestedJiraTask: JiraTaskAnalysis = {
      summary: summary || 'Task from Slack conversation',
      description: description || 'Task created from Slack thread analysis',
      priority: this.determinePriority(response),
      issueType: this.determineIssueType(response),
      acceptanceCriteria,
      estimatedStoryPoints: this.estimateStoryPoints(response),
    };

    return {
      summary: summary || 'Conversation analysis',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Key discussion points identified'],
      actionItems: actionItems.length > 0 ? actionItems : ['Action items to be completed'],
      participants: [...new Set(messages.map(msg => msg.user))],
      hasImages: files.length > 0,
      imageDescriptions: files.map(file => `Image: ${file.name || file.title}`),
      suggestedJiraTask,
    };
  }

  private determinePriority(response: string): 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest' {
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('urgent') || lowerResponse.includes('critical') || lowerResponse.includes('highest')) {
      return 'Highest';
    } else if (lowerResponse.includes('high priority') || lowerResponse.includes('important')) {
      return 'High';
    } else if (lowerResponse.includes('low priority') || lowerResponse.includes('minor')) {
      return 'Low';
    } else if (lowerResponse.includes('lowest')) {
      return 'Lowest';
    }
    return 'Medium';
  }

  private determineIssueType(response: string): 'Task' | 'Bug' | 'Story' | 'Epic' | 'Subtask' {
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('bug') || lowerResponse.includes('error') || lowerResponse.includes('issue')) {
      return 'Bug';
    } else if (lowerResponse.includes('story') || lowerResponse.includes('feature') || lowerResponse.includes('user story')) {
      return 'Story';
    } else if (lowerResponse.includes('epic') || lowerResponse.includes('large') || lowerResponse.includes('project')) {
      return 'Epic';
    } else if (lowerResponse.includes('subtask') || lowerResponse.includes('sub-task')) {
      return 'Subtask';
    }
    return 'Task';
  }

  private estimateStoryPoints(response: string): number | undefined {
    const storyPointMatch = response.match(/(\d+)\s*story\s*points?/i);
    if (storyPointMatch) {
      return parseInt(storyPointMatch[1]);
    }
    
    // Estimate based on content length and complexity
    const wordCount = response.split(' ').length;
    if (wordCount < 100) return 1;
    else if (wordCount < 300) return 3;
    else if (wordCount < 500) return 5;
    else return 8;
  }

  async generateTicketDescription(analysis: ConversationAnalysis): Promise<string> {
    const prompt = `Based on this conversation analysis, create a detailed Jira ticket description in Atlassian Document Format (ADF):

Summary: ${analysis.summary}
Key Points: ${analysis.keyPoints.join(', ')}
Action Items: ${analysis.actionItems.join(', ')}
Participants: ${analysis.participants.join(', ')}

Create a professional ticket description that includes:
1. Clear problem statement
2. Requirements
3. Acceptance criteria
4. Any relevant context from the conversation

Format the response as a structured description suitable for Jira.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || analysis.suggestedJiraTask.description;
    } catch (error) {
      console.error('Error generating ticket description:', error);
      return analysis.suggestedJiraTask.description;
    }
  }
}
