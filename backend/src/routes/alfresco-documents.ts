import { Router, Response } from 'express';
import { AlfrescoError, AlfrescoService, loadAlfrescoConfig } from '../services/alfresco.js';
import { SearchService, expandQueryTerms } from '../services/search.js';
import { OllamaService } from '../services/ollama.js';
import { getLanguageFromRequest } from '../utils/systemPrompt.js';
import { MAX_DOCUMENTS_FOR_CHAT } from './llm.js';
import { AlfrescoDocument } from '../types/index.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
// How many search hits are considered before picking the chat documents
const MAX_CHAT_CANDIDATES = 50;
const MAX_CHAT_TERMS = 30;

// Read-only browsing, search and chat over the configured Alfresco site's
// document library (including subfolders).
export function createAlfrescoDocumentsRouter(search: SearchService, ollama: OllamaService): Router {
  const router = Router();

  // The settings come from .env and don't change while the server runs, so one
  // service instance (which caches the document library id) is enough.
  let service: AlfrescoService | null | undefined;
  const getService = (): AlfrescoService | null => {
    if (service === undefined) {
      const config = loadAlfrescoConfig();
      service = config ? new AlfrescoService(config) : null;
    }
    return service;
  };

  const requireService = (res: Response): AlfrescoService | null => {
    const alfresco = getService();
    if (!alfresco) {
      res.status(503).json({ code: 'NOT_CONFIGURED', error: 'Alfresco is not configured' });
    }
    return alfresco;
  };

  const sendError = (res: Response, error: unknown) => {
    const status = error instanceof AlfrescoError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  };

  /**
   * Whether Alfresco is configured and reachable
   * GET /api/alfresco/status
   */
  router.get('/status', async (req, res) => {
    const alfresco = getService();
    if (!alfresco) {
      return res.json({ configured: false, connected: false });
    }
    try {
      await alfresco.getSiteDocumentLibrary();
      res.json({ configured: true, connected: true, site: alfresco.siteId });
    } catch (error) {
      res.json({
        configured: true,
        connected: false,
        site: alfresco.siteId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * List or search documents, one page at a time
   * GET /api/alfresco/documents?query=&page=&pageSize=
   */
  router.get('/documents', async (req, res) => {
    const alfresco = requireService(res);
    if (!alfresco) return;
    try {
      const query = typeof req.query.query === 'string' ? req.query.query : '';
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize) || DEFAULT_PAGE_SIZE));
      const result = await alfresco.searchDocuments({ query, skip: (page - 1) * pageSize, maxItems: pageSize });
      res.json({ ...result, page, pageSize, site: alfresco.siteId });
    } catch (error) {
      sendError(res, error);
    }
  });

  /**
   * GET /api/alfresco/documents/:nodeId
   */
  router.get('/documents/:nodeId', async (req, res) => {
    const alfresco = requireService(res);
    if (!alfresco) return;
    try {
      res.json(await alfresco.getSiteDocument(req.params.nodeId));
    } catch (error) {
      sendError(res, error);
    }
  });

  /**
   * Stream the file, so previews work without exposing the Alfresco credentials
   * GET /api/alfresco/documents/:nodeId/content
   */
  router.get('/documents/:nodeId/content', async (req, res) => {
    const alfresco = requireService(res);
    if (!alfresco) return;
    try {
      const { stream, mimeType, filename, size } = await alfresco.getSiteDocumentContent(req.params.nodeId);
      res.setHeader('Content-Type', mimeType);
      if (size !== undefined) res.setHeader('Content-Length', String(size));
      // Header values can't contain raw non-Latin1 characters (e.g. Japanese),
      // so provide an ASCII-safe fallback plus the RFC 5987 encoded name.
      const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );
      stream.on('error', err => {
        console.error('Alfresco content stream error:', err);
        res.destroy(err);
      });
      stream.pipe(res);
    } catch (error) {
      sendError(res, error);
    }
  });

  /**
   * Chat over Alfresco documents
   * POST /api/alfresco/chat { query, language, nodeIds?, searchQuery? }
   * - nodeIds: only those documents (the user's selection)
   * - searchQuery: only documents matching that search (the current results)
   * - neither: documents found by searching for the question itself
   */
  router.post('/chat', async (req, res) => {
    const alfresco = requireService(res);
    if (!alfresco) return;
    try {
      const { query, nodeIds, searchQuery } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }
      if (nodeIds !== undefined && !(Array.isArray(nodeIds) && nodeIds.every(id => typeof id === 'string'))) {
        return res.status(400).json({ error: 'nodeIds must be an array of strings' });
      }
      const language = getLanguageFromRequest(req.body);

      let candidates: AlfrescoDocument[];
      if (nodeIds !== undefined) {
        // Documents that were deleted or moved out of the site since being selected are skipped.
        const results = await Promise.allSettled(
          (nodeIds as string[]).slice(0, MAX_CHAT_CANDIDATES).map(id => alfresco.getSiteDocument(id)),
        );
        candidates = results.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
      } else if (typeof searchQuery === 'string' && searchQuery.trim()) {
        candidates = (await alfresco.searchDocuments({ query: searchQuery, maxItems: MAX_CHAT_CANDIDATES })).documents;
      } else {
        // A question rarely contains every word of a document, so match any of
        // its terms and let Alfresco's relevance order decide.
        const terms = expandQueryTerms(query.toLowerCase().split(/\s+/).filter(Boolean))
          .filter(t => /[^\x00-\x7f]/.test(t) || t.length >= 3)
          .slice(0, MAX_CHAT_TERMS);
        candidates =
          terms.length > 0
            ? (await alfresco.searchDocuments({ terms, match: 'any', maxItems: MAX_CHAT_CANDIDATES })).documents
            : [];
      }

      if (candidates.length === 0) {
        const noMatchMessage =
          language === 'ja'
            ? '質問に一致するAlfrescoのドキュメントが見つかりませんでした。別のキーワードでお試しください。'
            : 'No Alfresco documents matching your question were found. Try different keywords.';
        return res.json({ response: noMatchMessage, sources: [] });
      }

      // Every path above already narrowed the documents (selection, search, or
      // Alfresco's own matching), so treat the result as scoped.
      const relevantDocs = await search.pickChatDocuments(query, candidates, true, MAX_DOCUMENTS_FOR_CHAT);
      const contexts = relevantDocs.map(doc => getAlfrescoDocumentContext(doc, search));
      const response = await ollama.chat(query, contexts, language);
      const sources = relevantDocs.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        fileType: doc.fileType,
        summary: getAlfrescoDocumentSummary(doc, search),
      }));
      res.json({ response, sources });
    } catch (error) {
      console.error('Alfresco chat error:', error);
      sendError(res, error);
    }
  });

  return router;
}

// Documents exported by this app have their extracted data; for others only
// the metadata and search excerpt are available (the file itself isn't read).
function getAlfrescoDocumentContext(doc: AlfrescoDocument, search: SearchService): string {
  const lines: string[] = [];
  if (doc.alfresco.exportedByApp) {
    lines.push(search.getDocumentContext(doc));
  } else {
    lines.push(`File: ${doc.filename}`);
    lines.push(`Created: ${doc.uploadedAt}`);
    if (doc.alfresco.mimeType) lines.push(`Type: ${doc.alfresco.mimeType}`);
    if (doc.alfresco.description) lines.push(`Description: ${doc.alfresco.description}`);
    if (doc.alfresco.snippet) lines.push(`Excerpt: ${doc.alfresco.snippet}`);
    lines.push('(Only metadata is available for this document; its full content was not read.)');
  }
  if (doc.alfresco.path) lines.push(`Alfresco folder: ${doc.alfresco.path}`);
  return lines.join('\n');
}

function getAlfrescoDocumentSummary(doc: AlfrescoDocument, search: SearchService): string {
  if (doc.alfresco.exportedByApp) return search.getDocumentSummary(doc);
  return doc.alfresco.snippet || doc.alfresco.description || doc.alfresco.path || '';
}
