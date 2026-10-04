import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storage.js';
import { FileProcessor } from '../services/file-processor.js';
import { OllamaService } from '../services/ollama.js';
import { Document, AgentEvaluation } from '../types/index.js';
import { getLanguageFromRequest } from '../utils/systemPrompt.js';
import { AI_AGENTS } from '../config/agents.js';

const upload = multer({ storage: multer.memoryStorage() });
const MAX_REFERENCE_TEXT_LENGTH = 20000;

export function createUploadRouter(
  storage: StorageService,
  fileProcessor: FileProcessor,
  ollama: OllamaService,
): Router {
  const router = Router();

  router.post(
    '/',
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'referenceFile', maxCount: 1 },
    ]),
    async (req, res) => {
      let tempPath: string | undefined;
      try {
        const files = req.files as { file?: Express.Multer.File[]; referenceFile?: Express.Multer.File[] } | undefined;
        const uploadedFile = files?.file?.[0];
        const referenceFile = files?.referenceFile?.[0];

        if (!uploadedFile) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const { prompt } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: 'Extraction prompt is required' });
        }

        // Get language from request, default to English
        const language = getLanguageFromRequest(req.body);

        let requestedAgentIds: string[] = [];
        try {
          requestedAgentIds = JSON.parse(req.body.agentIds || '[]');
        } catch {
          requestedAgentIds = [];
        }
        const selectedAgents = AI_AGENTS.filter(a => requestedAgentIds.includes(a.id));

        const recordMatchAgent = selectedAgents.find(a => a.requiresReferenceFile);
        if (recordMatchAgent && !referenceFile) {
          return res.status(400).json({
            error: `A reference CSV/TXT file is required to run the "${recordMatchAgent.name}" agent`,
          });
        }
        const referenceText = referenceFile
          ? referenceFile.buffer.toString('utf-8').slice(0, MAX_REFERENCE_TEXT_LENGTH)
          : undefined;

        // Multer/busboy decodes multipart filename fields as latin1, which
        // mangles UTF-8 filenames (e.g. Japanese). Re-decode to get the
        // original UTF-8 text back.
        const originalName = Buffer.from(uploadedFile.originalname, 'latin1').toString('utf8');

        const docId = uuidv4();
        const ext = path.extname(originalName).toLowerCase();
        tempPath = path.join(os.tmpdir(), `${docId}${ext}`);

        // Save temp file
        await fs.writeFile(tempPath, uploadedFile.buffer);

        // Process file
        let content: string;
        let thumbnail: Buffer;
        let fileType: 'pdf' | 'image' | 'text';
        let ocrUsed = false;

        if (ext === '.pdf') {
          const result = await fileProcessor.processPDF(tempPath);
          content = result.content;
          thumbnail = result.thumbnail;
          fileType = 'pdf';
          ocrUsed = result.ocrUsed;
        } else if (ext === '.txt') {
          const result = await fileProcessor.processText(tempPath);
          content = result.content;
          thumbnail = result.thumbnail;
          fileType = 'text';
        } else {
          // Images go straight to the vision model (see below), not as text
          content = `[Image file: ${originalName}]`;
          thumbnail = await fileProcessor.createImageThumbnail(tempPath);
          fileType = 'image';
        }

        // Extract data using Ollama with language support (pass file path for images)
        const extractedData =
          fileType === 'image'
            ? await ollama.extractDataFromImage(tempPath, prompt, language)
            : await ollama.extractData(content, prompt, language);

        // Ask the model for a short list of relevant keywords, falling back to
        // the extracted field names if that fails (e.g. Ollama unreachable).
        const summaryText = Object.values(extractedData)
          .map(v => String(v))
          .join('\n');
        const llmKeywords = await ollama.extractKeywords(summaryText, language);
        const keywords: string[] =
          llmKeywords.length > 0
            ? [...llmKeywords, path.basename(originalName, ext)]
            : [originalName, ...Object.keys(extractedData).map(k => k.replace(/_/g, ' '))];

        // Run any AI agents the user selected (e.g. fraud detection, missing
        // info check) against the document and store their findings alongside it.
        // Images have no separate extracted-text pass (the image itself already
        // went straight into the Step 1 extraction call), so agents only get the
        // extra full-text context for pdf/text uploads.
        const agentExtractedText = fileType === 'image' ? undefined : content;

        const evaluations: AgentEvaluation[] = [];
        for (const agent of selectedAgents) {
          if (agent.type === 'record-match') {
            const result = await ollama.runRecordMatchEvaluation(
              summaryText,
              agentExtractedText,
              referenceText!,
              language,
            );

            evaluations.push({
              agentId: agent.id,
              agentName: agent.name,
              status: result.status,
              summary: result.summary,
              findings: result.findings,
              evaluatedAt: new Date().toISOString(),
            });
            continue;
          }

          const result = await ollama.runAgentEvaluation(summaryText, agentExtractedText, agent.task!, language);

          evaluations.push({
            agentId: agent.id,
            agentName: agent.name,
            status: result.status,
            summary: result.summary,
            findings: result.findings,
            evaluatedAt: new Date().toISOString(),
          });
        }

        // Save document with language preference
        const doc: Document = {
          id: docId,
          filename: originalName,
          uploadedAt: new Date().toISOString(),
          originalPrompt: prompt,
          extractedData,
          fileType,
          language,
          keywords: [...new Set(keywords)].slice(0, 50), // Limit to 50 keywords
          evaluations,
          extractedText: fileType === 'image' ? undefined : content,
          ocrUsed,
        };

        await storage.saveDocument(doc);
        await storage.saveOriginalFile(docId, tempPath, originalName);
        await storage.saveThumbnail(docId, thumbnail);

        res.json({ success: true, document: doc });
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Upload failed' });
      } finally {
        if (tempPath) await fs.unlink(tempPath).catch(() => {});
      }
    },
  );

  return router;
}
