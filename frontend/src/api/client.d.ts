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
export declare const api: {
    uploadFile: (file: File, prompt: string) => Promise<UploadResponse>;
    listDocuments: () => Promise<any>;
    getDocument: (id: string) => Promise<any>;
    deleteDocument: (id: string) => Promise<any>;
    search: (query: string) => Promise<SearchResults>;
    chat: (query: string) => Promise<ChatResponse>;
    getPrompts: () => Promise<any>;
    savePrompt: (name: string, prompt: string) => Promise<any>;
};
//# sourceMappingURL=client.d.ts.map