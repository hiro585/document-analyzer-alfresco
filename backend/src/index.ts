import { PORT } from './config/env.js';
import express from 'express';
import * as path from 'path';
import * as url from 'url';
import { StorageService } from './services/storage.js';
import { FileProcessor } from './services/file-processor.js';
import { SearchService } from './services/search.js';
import { OllamaService } from './services/ollama.js';
import { createUploadRouter } from './routes/upload.js';
import { createDocumentsRouter } from './routes/documents.js';
import { createPromptsRouter } from './routes/prompts.js';
import { createLLMRouter } from './routes/llm.js';
import { createAlfrescoExportRouter } from './routes/alfresco-export.js';
import { createAlfrescoDocumentsRouter } from './routes/alfresco-documents.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
const DATA_DIR = path.join(__dirname, '..', 'data');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Initialize services
const storage = new StorageService(DATA_DIR);
const ollama = new OllamaService();
const fileProcessor = new FileProcessor(ollama);
const search = new SearchService(storage);

// Routes
app.use('/api/upload', createUploadRouter(storage, fileProcessor, ollama, search));
app.use('/api/documents', createDocumentsRouter(storage));
app.use('/api/prompts', createPromptsRouter(storage));
app.use('/api/llm', createLLMRouter(storage, search, ollama));
app.use('/api/alfresco', createAlfrescoExportRouter(storage));
app.use('/api/alfresco', createAlfrescoDocumentsRouter(search, ollama));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize and start
async function start() {
  try {
    await storage.initializeStorage();
    console.log('Storage initialized');

    // Check Ollama connection
    try {
      const model = await ollama.selectModel();
      console.log(`Using LLM model: ${model}`);
    } catch (error) {
      console.error('Ollama not available - make sure Ollama is running');
      console.error('Download Ollama from https://ollama.com and run: ollama pull gemma3');
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
