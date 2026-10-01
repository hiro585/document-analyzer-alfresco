import { Router } from 'express';
import { StorageService } from '../services/storage.js';
import { SearchService } from '../services/search.js';
import { OllamaService } from '../services/ollama.js';
import { getLanguageFromRequest } from '../utils/systemPrompt.js';

const MAX_DOCUMENTS_FOR_CHAT = 5;

export function createLLMRouter(storage: StorageService, search: SearchService, ollama: OllamaService): Router {
  const router = Router();

  router.post('/chat', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Get language from request, default to English
      const language = getLanguageFromRequest(req.body);

      const documents = await storage.listDocuments();
      if (documents.length === 0) {
        const noDocsMessage =
          language === 'ja' ? 'システムに見つかったドキュメントがありません。' : 'No documents found in the system.';
        return res.json({ response: noDocsMessage, sources: [] });
      }

      // Narrow down to the documents whose keywords/description match the
      // question before handing anything to the LLM, and cap how many go in.
      const relevantDocs = await search.findRelevantDocuments(query, MAX_DOCUMENTS_FOR_CHAT);
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
