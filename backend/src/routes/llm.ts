import { Router } from 'express';
import { StorageService } from '../services/storage.js';
import { SearchService } from '../services/search.js';
import { OllamaService } from '../services/ollama.js';
import { getLanguageFromRequest } from '../utils/systemPrompt.js';

export const MAX_DOCUMENTS_FOR_CHAT = 5;

export function createLLMRouter(storage: StorageService, search: SearchService, ollama: OllamaService): Router {
  const router = Router();

  router.post('/chat', async (req, res) => {
    try {
      const { query, documentIds } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      if (
        documentIds !== undefined &&
        !(Array.isArray(documentIds) && documentIds.every(id => typeof id === 'string'))
      ) {
        return res.status(400).json({ error: 'documentIds must be an array of strings' });
      }

      // Get language from request, default to English
      const language = getLanguageFromRequest(req.body);

      // When the UI scopes the chat (selected documents or current search
      // results), only those documents are considered.
      const allDocuments = await storage.listDocuments();
      const scoped = documentIds !== undefined;
      const idSet = new Set<string>(documentIds ?? []);
      const candidates = scoped ? allDocuments.filter(doc => idSet.has(doc.id)) : allDocuments;

      if (candidates.length === 0) {
        const noDocsMessage =
          language === 'ja' ? 'システムに見つかったドキュメントがありません。' : 'No documents found in the system.';
        return res.json({ response: noDocsMessage, sources: [] });
      }

      const relevantDocs = await search.pickChatDocuments(query, candidates, scoped, MAX_DOCUMENTS_FOR_CHAT);

      if (relevantDocs.length === 0) {
        const noMatchMessage =
          language === 'ja'
            ? '質問に一致するドキュメントが見つかりませんでした。別のキーワードでお試しください。'
            : 'No documents matching your question were found. Try different keywords.';
        return res.json({ response: noMatchMessage, sources: [] });
      }

      const contexts = relevantDocs.map(doc => search.getDocumentContext(doc));

      // Call Ollama for semantic search with language support
      const response = await ollama.chat(query, contexts, language);
      const sources = relevantDocs.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        fileType: doc.fileType,
        summary: search.getDocumentSummary(doc),
      }));
      res.json({ response, sources });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Chat failed' });
    }
  });

  return router;
}
