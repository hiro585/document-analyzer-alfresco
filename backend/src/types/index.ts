export interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
  originalPrompt: string;
  extractedData: Record<string, any>;
  fileType: 'pdf' | 'image' | 'text';
  keywords: string[];
}

export interface ExtractedData {
  [key: string]: any;
}

export interface Prompt {
  id: string;
  name: string;
  prompt: string;
  isTemplate?: boolean;
}

export interface PromptStore {
  templates: Prompt[];
  custom: Prompt[];
}

export interface SearchIndex {
  keywords: Record<string, string[]>;
}
