import axios from 'axios';
import type { AlfrescoDocument, Document } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UploadResponse {
  success: boolean;
  document: Document;
}

export interface ChatSource {
  id: string;
  filename: string;
  fileType: string;
  summary: string;
}

export interface ChatResponse {
  response: string;
  sources: ChatSource[];
}

export interface RelatedDocument {
  id: string;
  filename: string;
  fileType: string;
  summary: string;
  // Content similarity to the source document, 0-1. Absent for Alfresco, which
  // ranks by its own relevance score (not comparable across searches).
  score?: number;
}

export interface AlfrescoStatus {
  configured: boolean;
  connected: boolean;
  site?: string;
  error?: string;
}

export interface AlfrescoDocumentPage {
  documents: AlfrescoDocument[];
  totalItems: number;
  page: number;
  pageSize: number;
  site: string;
}

// What an Alfresco chat question covers; neither field means the whole site.
export interface AlfrescoChatScope {
  nodeIds?: string[];
  searchQuery?: string;
}

export type LlmStatus =
  | { available: true; model: string }
  | {
      available: false;
      reason: 'unreachable' | 'no_models' | 'model_not_set' | 'model_missing';
      message: string;
      model?: string;
      installed?: string[];
    };

// The backend's own error message (e.g. "Could not connect to Ollama… Make sure
// Ollama is running.") rather than axios's "Request failed with status code 500".
// Undefined when the backend couldn't be reached at all.
export function apiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    return typeof message === 'string' ? message : undefined;
  }
  return error instanceof Error ? error.message : undefined;
}

export const api = {
  getLlmStatus: async (): Promise<LlmStatus> => {
    return client.get('/llm/status').then(r => r.data);
  },

  uploadFile: async (
    file: File,
    prompt: string,
    language: string = 'en',
    agentIds: string[] = [],
    referenceFile?: File | null,
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    formData.append('language', language);
    formData.append('agentIds', JSON.stringify(agentIds));
    if (referenceFile) {
      formData.append('referenceFile', referenceFile);
    }
    return client
      .post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data);
  },

  listDocuments: async (): Promise<Document[]> => {
    return client.get('/documents').then(r => r.data);
  },

  getDocument: async (id: string): Promise<Document> => {
    return client.get(`/documents/${id}`).then(r => r.data);
  },

  getDocumentFileUrl: (id: string): string => {
    return `${API_BASE_URL}/documents/${id}/file`;
  },

  getDocumentThumbnailUrl: (id: string): string => {
    return `${API_BASE_URL}/documents/${id}/thumbnail`;
  },

  getRelatedDocuments: async (id: string): Promise<RelatedDocument[]> => {
    return client.get(`/documents/${id}/related`).then(r => r.data);
  },

  deleteDocument: async (id: string) => {
    return client.delete(`/documents/${id}`).then(r => r.data);
  },

  // documentIds limits the chat to those documents; omit it to search all documents.
  chat: async (query: string, language: string = 'en', documentIds?: string[]): Promise<ChatResponse> => {
    return client.post('/llm/chat', { query, language, documentIds }).then(r => r.data);
  },

  // Alfresco operations
  exportDocumentToAlfresco: async (documentId: string) => {
    return client.post(`/alfresco/export/${documentId}`).then(r => r.data);
  },

  exportAllToAlfresco: async () => {
    return client.post('/alfresco/export-all').then(r => r.data);
  },

  // Alfresco browsing (read-only, limited to the configured site's document library)
  getAlfrescoStatus: async (): Promise<AlfrescoStatus> => {
    return client.get('/alfresco/status').then(r => r.data);
  },

  searchAlfrescoDocuments: async (query: string, page: number, pageSize: number): Promise<AlfrescoDocumentPage> => {
    return client.get('/alfresco/documents', { params: { query, page, pageSize } }).then(r => r.data);
  },

  getAlfrescoDocument: async (nodeId: string): Promise<AlfrescoDocument> => {
    return client.get(`/alfresco/documents/${nodeId}`).then(r => r.data);
  },

  getAlfrescoDocumentContentUrl: (nodeId: string): string => {
    return `${API_BASE_URL}/alfresco/documents/${nodeId}/content`;
  },

  getAlfrescoDocumentThumbnailUrl: (nodeId: string): string => {
    return `${API_BASE_URL}/alfresco/documents/${nodeId}/thumbnail`;
  },

  getAlfrescoRelatedDocuments: async (nodeId: string): Promise<RelatedDocument[]> => {
    return client.get(`/alfresco/documents/${nodeId}/related`).then(r => r.data);
  },

  chatAlfresco: async (
    query: string,
    language: string = 'en',
    scope: AlfrescoChatScope = {},
  ): Promise<ChatResponse> => {
    return client.post('/alfresco/chat', { query, language, ...scope }).then(r => r.data);
  },
};
