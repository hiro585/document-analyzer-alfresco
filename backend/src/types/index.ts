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

// A document from the configured Alfresco site, in the same shape as a local
// document. For documents exported by this app, extractedData/keywords come
// from the JSON stored in cm:description; for others they're empty.
export interface AlfrescoDocument extends Document {
  alfresco: {
    nodeId: string;
    name: string;
    path?: string;
    mimeType?: string;
    sizeInBytes?: number;
    createdBy?: string;
    modifiedAt: string;
    modifiedBy?: string;
    // Plain cm:description, when it isn't this app's exported JSON
    description?: string;
    exportedByApp: boolean;
    // Matching excerpt of the content from the last search
    snippet?: string;
    shareUrl?: string;
  };
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
