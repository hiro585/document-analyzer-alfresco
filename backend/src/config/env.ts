import dotenv from 'dotenv';
import * as path from 'path';
import * as url from 'url';

// Load .env from the project root. This module must be imported before any
// other module that reads process.env at load time.
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const PORT = Number(process.env.PORT) || 3001;

export const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
export const OLLAMA_API_URL = `${OLLAMA_URL}/api`;
