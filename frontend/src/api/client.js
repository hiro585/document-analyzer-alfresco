import axios from 'axios';
const API_BASE_URL = 'http://localhost:3001/api';
const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
export const api = {
    uploadFile: async (file, prompt) => {
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
    getDocument: async (id) => {
        return client.get(`/documents/${id}`).then(r => r.data);
    },
    deleteDocument: async (id) => {
        return client.delete(`/documents/${id}`).then(r => r.data);
    },
    search: async (query) => {
        return client.post('/search', { query }).then(r => r.data);
    },
    chat: async (query) => {
        return client.post('/llm/chat', { query }).then(r => r.data);
    },
    getPrompts: async () => {
        return client.get('/prompts').then(r => r.data);
    },
    savePrompt: async (name, prompt) => {
        return client.post('/prompts', { name, prompt }).then(r => r.data);
    },
};
//# sourceMappingURL=client.js.map