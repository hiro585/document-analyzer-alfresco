import { Router } from 'express';
import { StorageService } from '../services/storage.js';

export function createDocumentsRouter(storage: StorageService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const documents = await storage.listDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const doc = await storage.loadDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load document' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  return router;
}
