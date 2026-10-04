import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from '../services/storage.js';
import { SearchService } from '../services/search.js';
import { FileProcessor } from '../services/file-processor.js';

// Thumbnails never change for a given document id
const THUMBNAIL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const MAX_RELATED_DOCUMENTS = 5;

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
};

export function createDocumentsRouter(
  storage: StorageService,
  search: SearchService,
  fileProcessor: FileProcessor,
): Router {
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

  router.get('/:id/related', async (req, res) => {
    try {
      const doc = await storage.loadDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const related = await search.findRelatedDocuments(req.params.id, MAX_RELATED_DOCUMENTS);
      res.json(
        related.map(({ doc: relatedDoc, score }) => ({
          id: relatedDoc.id,
          filename: relatedDoc.filename,
          fileType: relatedDoc.fileType,
          summary: search.getDocumentSummary(relatedDoc),
          score,
        })),
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to find related documents' });
    }
  });

  // Text files have no thumbnail (404); the UI shows a file-type icon instead.
  router.get('/:id/thumbnail', async (req, res) => {
    try {
      const doc = await storage.loadDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      if (doc.fileType === 'image') {
        return res.sendFile(await storage.getThumbnailPath(doc.id), { maxAge: THUMBNAIL_MAX_AGE_MS });
      }
      if (doc.fileType === 'pdf') {
        const thumbnailPath = storage.getPdfThumbnailPath(doc.id);
        try {
          await fs.access(thumbnailPath);
        } catch {
          const originalPath = await storage.getOriginalFilePath(doc.id);
          if (!originalPath) {
            return res.status(404).json({ error: 'File not found' });
          }
          await fs.writeFile(thumbnailPath, await fileProcessor.renderPdfThumbnail(originalPath));
        }
        return res.sendFile(thumbnailPath, { maxAge: THUMBNAIL_MAX_AGE_MS });
      }
      res.status(404).json({ error: 'No thumbnail for this file type' });
    } catch (error) {
      console.error('Thumbnail error:', error);
      res.status(500).json({ error: 'Failed to load thumbnail' });
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
      if (!(await storage.loadDocument(req.params.id))) {
        return res.status(404).json({ error: 'Document not found' });
      }
      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  return router;
}
