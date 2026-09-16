import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UploadResponse {
  success: boolean;
  document: any;
}

export interface SearchResults {
  results: any[];
}

export interface ChatResponse {
  response: string;
}

export const api = {
  uploadFile: async (file: File, prompt: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    return client.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  listDocuments: async () => {
    return client.get('/documents').then(r => r.data);
  },

  getDocument: async (id: string) => {
    return client.get(`/documents/${id}`).then(r => r.data);
  },

  deleteDocument: async (id: string) => {
    return client.delete(`/documents/${id}`).then(r => r.data);
  },

  search: async (query: string): Promise<SearchResults> => {
    return client.post('/search', { query }).then(r => r.data);
  },

  chat: async (query: string): Promise<ChatResponse> => {
    return client.post('/llm/chat', { query }).then(r => r.data);
  },

  getPrompts: async () => {
    return client.get('/prompts').then(r => r.data);
  },

  savePrompt: async (name: string, prompt: string) => {
    return client.post('/prompts', { name, prompt }).then(r => r.data);
  },
};
