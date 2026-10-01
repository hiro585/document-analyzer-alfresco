// Mirrors the document shape returned by the backend (backend/src/types/index.ts)

export interface AgentEvaluation {
  agentId: string;
  agentName: string;
  status: 'pass' | 'issues_found' | 'error';
  summary: string;
  findings: string[];
  evaluatedAt: string;
  relatedDocuments?: { id: string; filename: string; score: number }[];
}

export interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
  originalPrompt: string;
  extractedData: Record<string, unknown>;
  fileType: 'pdf' | 'image' | 'text';
  keywords: string[];
  language?: 'en' | 'ja';
  alfrescoNodeId?: string;
  alfrescoExportedAt?: string;
  evaluations?: AgentEvaluation[];
  extractedText?: string;
  ocrUsed?: boolean;
}

// A document from the configured Alfresco site, mapped onto the local document
// shape (mirrors AlfrescoDocument in backend/src/types/index.ts).
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
    description?: string;
    exportedByApp: boolean;
    snippet?: string;
    shareUrl?: string;
  };
}
