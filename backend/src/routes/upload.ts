import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storage.js';
import { FileProcessor } from '../services/file-processor.js';
import { OllamaService } from '../services/ollama.js';
import { Document } from '../types/index.js';

const upload = multer({ storage: multer.memoryStorage() });

export function createUploadRouter(
  storage: StorageService,
  fileProcessor: FileProcessor,
  ollama: OllamaService
): Router {
  const router = Router();

  router.post('/', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Extraction prompt is required' });
      }

      const docId = uuidv4();
      const ext = path.extname(req.file.originalname).toLowerCase();
      const tempPath = path.join('/tmp', `${docId}${ext}`);

      // Save temp file
      await fs.writeFile(tempPath, req.file.buffer);

      // Process file
      let content: string;
      let thumbnail: Buffer;
      let fileType: 'pdf' | 'image' | 'text';
      let pageCount = 1;

      if (ext === '.pdf') {
        const result = await fileProcessor.processPDF(tempPath);
        content = result.content;
        thumbnail = result.thumbnail;
        fileType = 'pdf';
        pageCount = result.pageCount;
      } else if (ext === '.txt') {
        const result = await fileProcessor.processText(tempPath);
        content = result.content;
        thumbnail = result.thumbnail;
        fileType = 'text';
      } else {
        const result = await fileProcessor.processImage(tempPath);
        // For images, send the file path for better LLaVA processing
        content = `[Image file: ${req.file.originalname}]`;
        thumbnail = result.thumbnail;
        fileType = 'image';
      }

      // Extract data using Ollama (pass file path for images)
      const extractedData = fileType === 'image'
        ? await ollama.extractDataFromImage(tempPath, prompt)
        : await ollama.extractData(content, prompt);

      // Create keywords from extracted data and filename
      const keywords: string[] = [
        req.file.originalname.toLowerCase(),
        ...Object.keys(extractedData),
        ...Object.values(extractedData)
          .map(v => String(v).toLowerCase().split(/\s+/))
          .flat()
          .filter(k => k.length > 2),
      ];

      // Save document
      const doc: Document = {
        id: docId,
        filename: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        originalPrompt: prompt,
        extractedData,
        fileType,
        keywords: [...new Set(keywords)].slice(0, 50), // Limit to 50 keywords
      };

      await storage.saveDocument(doc);
      await storage.saveOriginalFile(docId, tempPath, req.file.originalname);
      await storage.saveThumbnail(docId, thumbnail);

      // Clean up temp file
      await fs.unlink(tempPath);

      res.json({ success: true, document: doc });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      const details = error instanceof Error ? error.stack : '';
      console.error('Error details:', details);
      res.status(500).json({
        error: errorMsg,
        details: details.split('\n').slice(0, 3).join(' ')
      });
    }
  });

  return router;
}
