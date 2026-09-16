import { Router } from 'express';
import { StorageService } from '../services/storage.js';
import { SearchService } from '../services/search.js';
import { OllamaService } from '../services/ollama.js';

export function createLLMRouter(
  storage: StorageService,
  search: SearchService,
  ollama: OllamaService
): Router {
  const router = Router();

  router.post('/chat', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Get all documents for context
      const documents = await storage.listDocuments();
      if (documents.length === 0) {
        return res.json({ response: 'No documents found in the system.' });
      }

      // Prepare context from all documents
      const contexts = documents.map(doc => search.getDocumentContext(doc));

      // Call Ollama for semantic search
      const response = await ollama.chat(query, contexts);
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Chat failed' });
    }
  });

  return router;
}
