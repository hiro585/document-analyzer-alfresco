import { Router } from 'express';
import * as path from 'path';
import { StorageService } from '../services/storage.js';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
};

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

  router.get('/:id/file', async (req, res) => {
    try {
      const doc = await storage.loadDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const filePath = await storage.getOriginalFilePath(req.params.id);
      if (!filePath) {
        return res.status(404).json({ error: 'File not found' });
      }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
      // Header values can't contain raw non-Latin1 characters (e.g. Japanese),
      // so provide an ASCII-safe fallback plus the RFC 5987 encoded name.
      const asciiFallback = doc.filename.replace(/[^\x20-\x7e]/g, '_');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      );
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load file' });
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
