import dotenv from 'dotenv';
import express from 'express';
import * as path from 'path';
import * as url from 'url';
import { StorageService } from './services/storage.js';
import { FileProcessor } from './services/file-processor.js';
import { SearchService } from './services/search.js';
import { OllamaService } from './services/ollama.js';
import { createUploadRouter } from './routes/upload.js';
import { createDocumentsRouter } from './routes/documents.js';
import { createSearchRouter } from './routes/search.js';
import { createPromptsRouter } from './routes/prompts.js';
import { createLLMRouter } from './routes/llm.js';
import { createAlfrescoExportRouter } from './routes/alfresco-export.js';

dotenv.config();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
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
const fileProcessor = new FileProcessor();
const search = new SearchService(storage);
const ollama = new OllamaService();

// Routes
app.use('/api/upload', createUploadRouter(storage, fileProcessor, ollama));
app.use('/api/documents', createDocumentsRouter(storage));
app.use('/api/search', createSearchRouter(search));
app.use('/api/prompts', createPromptsRouter(storage));
app.use('/api/llm', createLLMRouter(storage, search, ollama));
app.use('/api/alfresco', createAlfrescoExportRouter(storage));

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
      console.error('Download Ollama from https://ollama.ai and run: ollama run llava');
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
