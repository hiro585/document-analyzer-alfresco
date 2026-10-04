import dotenv from 'dotenv';
import * as path from 'path';
import * as url from 'url';

// Load .env from the project root. This module must be imported before any
// other module that reads process.env at load time.
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const PORT = Number(process.env.PORT) || 3001;

// Browser origins allowed to call the API (comma-separated). The API has no
// authentication, so it must not be callable from arbitrary websites.
export const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
export const OLLAMA_API_URL = `${OLLAMA_URL}/api`;
// Required: the installed Ollama model to use (e.g. gemma3:4b or qwen3-vl:4b-instruct).
// When empty, uploads and chat report that no model is selected.
export const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || '').trim();
