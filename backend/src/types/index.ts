export interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
  originalPrompt: string;
  extractedData: Record<string, any>;
  fileType: 'pdf' | 'image' | 'text';
  keywords: string[];
  language?: 'en' | 'ja';
  alfrescoNodeId?: string;
  alfrescoExportedAt?: string;
  evaluations?: AgentEvaluation[];
  extractedText?: string;
  ocrUsed?: boolean;
}

export interface AgentEvaluation {
  agentId: string;
  agentName: string;
  status: 'pass' | 'issues_found' | 'error';
  summary: string;
  findings: string[];
  evaluatedAt: string;
  relatedDocuments?: { id: string; filename: string; score: number }[];
}

export interface ExtractedData {
  [key: string]: any;
}

export interface Prompt {
  id: string;
  name: string;
  prompt: string;
  isTemplate?: boolean;
  translations?: {
    ja?: {
      name: string;
      prompt: string;
    };
  };
}

export interface PromptStore {
  templates: Prompt[];
  custom: Prompt[];
}

export interface SearchIndex {
  keywords: Record<string, string[]>;
}
