import axios from 'axios';
import type { Document } from '../types';

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

export const api = {
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

  deleteDocument: async (id: string) => {
    return client.delete(`/documents/${id}`).then(r => r.data);
  },

  chat: async (query: string, language: string = 'en'): Promise<ChatResponse> => {
    return client.post('/llm/chat', { query, language }).then(r => r.data);
  },

  getPrompts: async (language: string = 'en') => {
    return client.get('/prompts', { params: { language } }).then(r => r.data);
  },

  // Alfresco operations
  testAlfrescoConnection: async () => {
    return client.get('/alfresco/test').then(r => r.data);
  },

  exportDocumentToAlfresco: async (documentId: string) => {
    return client.post(`/alfresco/export/${documentId}`).then(r => r.data);
  },

  exportAllToAlfresco: async () => {
    return client.post('/alfresco/export-all').then(r => r.data);
  },

  listAlfrescoDocuments: async () => {
    return client.get('/alfresco/list').then(r => r.data);
  },
};
