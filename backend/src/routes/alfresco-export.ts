import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs/promises';
import { StorageService } from '../services/storage.js';
import { AlfrescoService, AlfrescoConfig } from '../services/alfresco.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find the original file path for a document
 */
async function getDocumentFilePath(documentId: string, fileType: string): Promise<string> {
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const docDir = path.join(dataDir, 'documents', documentId);

  // List files in document directory
  const files = await fs.readdir(docDir);

  // Find original file (starts with 'original.')
  const originalFile = files.find(f => f.startsWith('original.'));
  if (originalFile) {
    return path.join(docDir, originalFile);
  }

  throw new Error(`Original file not found for document ${documentId}`);
}

export function createAlfrescoExportRouter(storage: StorageService) {
  const router = Router();

  // Get Alfresco configuration from environment variables
  const getAlfrescoConfig = (): AlfrescoConfig => {
    const baseUrl = process.env.ALFRESCO_URL;
    const username = process.env.ALFRESCO_USERNAME;
    const password = process.env.ALFRESCO_PASSWORD;

    if (!baseUrl || !username || !password) {
      throw new Error(
        'Missing Alfresco configuration. Please set ALFRESCO_URL, ALFRESCO_USERNAME, and ALFRESCO_PASSWORD in .env file',
      );
    }

    return { baseUrl, username, password };
  };

  /**
   * Test Alfresco connection
   * GET /api/alfresco/test
   */
  router.get('/test', async (req: Request, res: Response) => {
    try {
      const config = getAlfrescoConfig();
      const alfrescoService = new AlfrescoService(config);
      const connected = await alfrescoService.testConnection();

      if (connected) {
        res.json({
          success: true,
          message: 'Connected to Alfresco successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to connect to Alfresco',
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Export single document to Alfresco
   * POST /api/alfresco/export/:documentId
   */
  router.post('/export/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      // Load document from local storage
      const document = await storage.loadDocument(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      // Get actual file path
      const filePath = await getDocumentFilePath(documentId, document.fileType);

      // Store to Alfresco
      const config = getAlfrescoConfig();
      const alfrescoService = new AlfrescoService(config);
      const result = await alfrescoService.storeDocumentData(document, filePath);

      // Update document with Alfresco info and save back to local storage
      document.alfrescoNodeId = result.nodeId;
      document.alfrescoExportedAt = new Date().toISOString();
      await storage.saveDocument(document);

      res.json({
        success: true,
        message: 'Document exported to Alfresco',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Export all documents to Alfresco
   * POST /api/alfresco/export-all
   */
  router.post('/export-all', async (req: Request, res: Response) => {
    try {
      const documents = await storage.listDocuments();
      const config = getAlfrescoConfig();
      const alfrescoService = new AlfrescoService(config);

      const results = [];
      const errors = [];

      for (const doc of documents) {
        try {
          // Get actual file path
          const filePath = await getDocumentFilePath(doc.id, doc.fileType);
          const result = await alfrescoService.storeDocumentData(doc, filePath);
          results.push(result);

          // Update document with Alfresco info
          doc.alfrescoNodeId = result.nodeId;
          doc.alfrescoExportedAt = new Date().toISOString();
          await storage.saveDocument(doc);
        } catch (error) {
          errors.push({
            documentId: doc.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        success: true,
        exported: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * List exported documents in Alfresco
   * GET /api/alfresco/list
   */
  router.get('/list', async (req: Request, res: Response) => {
    try {
      const config = getAlfrescoConfig();
      const alfrescoService = new AlfrescoService(config);
      const documents = await alfrescoService.listDocuments();

      res.json({
        success: true,
        count: documents.length,
        documents: documents.map(entry => ({
          id: entry.entry.id,
          name: entry.entry.name,
          createdAt: entry.entry.createdAt,
          modifiedAt: entry.entry.modifiedAt,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
