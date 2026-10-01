# Document Analyzer

A local, privacy-first web app for analyzing documents with AI. Upload PDFs, images, or text files, describe what to extract in a prompt, and a model running locally in [Ollama](https://ollama.com) returns structured data. Optional AI "agents" can check documents for fraud, missing information, duplicates, or mismatches against a reference list. You can browse the document library, chat with your documents, and export them to Alfresco if you use it. The UI and AI responses support English and Japanese.

## Features

- **Upload and extract**: drag and drop a PDF, JPG/PNG, or TXT file and choose a prompt template or write your own. The model returns structured fields plus keywords.
- **Scanned PDF support**: PDFs with a text layer are read directly. Pages without one are rasterized with `pdftoppm` and transcribed by the Ollama vision model. Only the first 5 pages are processed.
- **Evaluation agents** (optional, selected per upload):
  - *Fraud Detection*: LLM check for falsified or inconsistent content.
  - *Missing Information Check*: LLM check for blank or incomplete fields.
  - *Similar Document Check*: keyword/text-overlap search against existing documents (no model call).
  - *Record Match*: compares extracted data against an uploaded CSV/TXT reference file. The file is required.
- **Document library**: thumbnail and list views, pagination, detail view with extracted data and source text, delete.
- **Chat**: ask questions in natural language from a panel next to the document library. You can ask about the documents you ticked, the current search results, or all documents. Up to 5 of the most relevant documents (picked by keyword matching) are passed to the model as context, and their sources are returned with the answer.
- **Multi-language**: the UI strings, prompt templates, and model responses follow the selected language (English or Japanese).
- **Alfresco export** (optional): push single documents or all documents, with extracted data as metadata, to an Alfresco repository.
- **Alfresco browsing** (optional): a read-only *Documents (Alfresco)* tab that searches the configured site's document library (including subfolders), previews files, and chats over them with the same *Ask about* scopes as the local tab.
- **Local storage**: all files and metadata are stored as plain files and JSON under `backend/data/`. There is no database.

## Tech stack

| Layer    | Technologies |
|----------|--------------|
| Backend  | Node.js, Express, TypeScript (ESM, run with `tsx` in dev), Multer, pdfjs-dist, sharp, axios |
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS |
| AI       | Ollama REST API (local) |
| PDF OCR  | `pdftoppm` (poppler-utils) + Ollama vision model |

## Prerequisites

- **Node.js 18+** and npm
- **Ollama**, running locally (default `http://localhost:11434`). Pull at least one model:

  ```bash
  ollama pull gemma3      # preferred: vision-capable, used for images and scanned PDFs
  ollama pull mistral     # optional text-only fallback
  ```

  The backend picks a model automatically, in this order: the first installed model whose name contains `gemma3`, then `mistral`, then `llama`, and otherwise whatever model is listed first. Image uploads and scanned-PDF transcription need a **vision-capable** model, such as `gemma3` or `llava`.

- **poppler-utils** (provides `pdftoppm`), needed only for scanned or image-only PDFs:

  ```bash
  sudo apt-get install poppler-utils   # Debian/Ubuntu
  brew install poppler                 # macOS
  ```

## Getting started

```bash
git clone <this-repo-url>
cd <repo>

# Install root, backend and frontend dependencies
npm install && npm run setup

# Configure (optional, defaults work for a local setup)
cp .env.example .env

# Start Ollama if it is not already running
ollama serve

# Run backend (http://localhost:3001) and frontend (http://localhost:5173)
npm run dev
```

The `start.sh` script does the same as the last step and installs dependencies first if they are missing. You can also run each side on its own with `npm run dev` inside `backend/` or `frontend/`.

Production build:

```bash
npm run build   # compiles backend to backend/dist and frontend to frontend/dist
npm start       # runs the compiled backend
```

`backend/data/` (documents, prompts, search index) is created on first start and is gitignored.

## Configuration

The backend reads `.env` from the **project root**. Copy `.env.example` to start.

| Variable            | Where              | Default                     | Description |
|---------------------|--------------------|-----------------------------|-------------|
| `PORT`              | root `.env`        | `3001`                      | Backend HTTP port |
| `OLLAMA_URL`        | root `.env`        | `http://localhost:11434`    | Base URL of the Ollama server |
| `ALFRESCO_URL`      | root `.env`        | none                        | Alfresco public REST API base, e.g. `http://host:8080/alfresco/api/-default-/public/alfresco/versions/1` |
| `ALFRESCO_USERNAME` | root `.env`        | none                        | Alfresco user |
| `ALFRESCO_PASSWORD` | root `.env`        | none                        | Alfresco password |
| `ALFRESCO_SITE`     | root `.env`        | `demo`                      | Site whose `documentLibrary` is used for export and browsing |
| `ALFRESCO_SEARCH_URL` | root `.env`      | derived from `ALFRESCO_URL` | Search API endpoint, e.g. `http://host:8080/alfresco/api/-default-/public/search/versions/1/search`. Set it only if your server uses a non-standard path |
| `VITE_API_URL`      | `frontend/.env`    | `http://localhost:3001/api` | Backend API base URL used by the frontend (read at build time) |

The Alfresco variables are needed only for the export feature and the *Documents (Alfresco)* tab. Never commit `.env` files.

## Usage

1. **Upload**: select a file, pick a prompt template (or write a custom prompt and save it), optionally select agents (Record Match also asks for a CSV/TXT reference file), then click *Upload and Analyze*. Extracted data, keywords, and agent results appear when processing finishes.
2. **Documents (Local)**: browse, search, and page through uploaded documents. Open one to see its extracted data, view the original file or extracted text, export it to Alfresco, or delete it.
3. **Chat** (the 💬 panel on the same tab): ask questions, for example "Which invoices are from March?". Use *Ask about* to choose which documents the question covers: the ones you ticked, the current search results, or all of them. Ticking a document switches the chat to *Selected*. The answer lists the source documents it used, and clicking one opens its details. On narrower screens the chat opens as a drawer from the 💬 button.

Use the language switcher in the header to change between English and Japanese. The choice is saved in `localStorage` and is sent to the backend so the model answers in that language.

Processing speed depends on your hardware. A GPU helps a lot, and on CPU alone a single upload can take tens of seconds or more.

## Alfresco integration

Exporting is optional. Everything stays in local storage whether or not you export.

1. Set `ALFRESCO_URL`, `ALFRESCO_USERNAME`, and `ALFRESCO_PASSWORD` in `.env`, then restart the backend.
2. The target repository must have a site with the id **`demo`** (or the id set in `ALFRESCO_SITE`). Files are uploaded to that site's `documentLibrary`, and a timestamp is added to each filename to keep it unique.
3. Each exported node gets `cm:title` set to the original filename and `cm:description` set to a JSON summary of the extracted data. The Alfresco node ID and export time are saved back to the local document metadata.

You can export from the UI (after an upload, per document, or *Export All* on the Documents page) or through the API (see below). `./test-alfresco.sh` runs a connection test, a single export, and a listing against a running backend.

### Browsing Alfresco (*Documents (Alfresco)* tab)

The tab works like *Documents (Local)* but reads from the configured site's document library, including subfolders. It is read-only: there is no delete or export.

- If the `ALFRESCO_*` variables are missing, the tab shows a "not configured" message with the settings to add. If Alfresco can't be reached, it shows the error and a *Retry* button.
- Search runs in Alfresco (name, title, description, and indexed content), and results are paged by Alfresco, so *Select all on this page* replaces *Select all results*.
- Documents exported by this app show their extracted data and keywords, read from the JSON in `cm:description`. Other documents show their Alfresco metadata and description only.
- Chat uses the same rules as the local tab, with one limitation: for documents not exported by this app, the model sees only the title, description, and search excerpt, not the full file content.
- Files are streamed through the backend, so the Alfresco credentials never reach the browser. All Alfresco access uses the single account from `.env`, and the backend has no login of its own, so anyone who can reach the backend can browse that site's documents.

## Translations

UI strings live in `frontend/public/translations.xml`, one `<string>` element per key:

```xml
<string key="upload.button" en="Upload and Analyze" ja="アップロードして分析" />
```

Components get translated strings from `useLanguage().t('upload.button')` (see `frontend/src/contexts/LanguageContext.tsx`). A key is loaded only if it has **both** `en` and `ja` values.

- **Adding a string**: add a `<string>` element with all language attributes and use `t('your.key')`. The XML is fetched at runtime, so a page reload is enough.
- **Prompt template translations**: the default templates are seeded into `backend/data/prompts.json` with a `translations.ja` block (see `backend/src/services/storage.ts`). `GET /api/prompts?language=ja` returns them translated.
- **Adding a language** means changing code in several places:
  - Frontend: add the attribute to every entry in `translations.xml`, extend the `Language` type and XML parsing in `LanguageContext.tsx`, and add a button in `components/LanguageSwitcher.tsx`.
  - Backend: extend `Language`, `isValidLanguage`, and the per-language system and extraction prompts in `backend/src/utils/systemPrompt.ts`, plus the language-specific instruction strings in `backend/src/services/ollama.ts`.

## Project structure

```
.
├── backend/
│   └── src/
│       ├── index.ts            # Express app, route wiring, startup
│       ├── config/agents.ts    # Evaluation agent definitions
│       ├── routes/             # upload, documents, prompts, llm, alfresco-export, alfresco-documents
│       ├── services/           # ollama, file-processor, storage, search, alfresco
│       ├── types/              # Shared TypeScript types
│       └── utils/              # Language-aware system prompts, translator
├── frontend/
│   ├── public/translations.xml # UI strings (en/ja)
│   └── src/
│       ├── App.tsx             # Tabs: Upload / Documents (Local) / Documents (Alfresco)
│       ├── api/client.ts       # Backend API client
│       ├── components/         # UploadZone, PromptEditor, AgentSelector, ChatPanel, ...
│       ├── contexts/           # LanguageContext
│       ├── pages/              # Upload, Documents and AlfrescoDocuments (library + chat)
│       └── styles/
├── start.sh                    # Install-if-needed + npm run dev
└── test-alfresco.sh            # Alfresco export smoke test
```

## API endpoints

All routes are served under `http://localhost:3001/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/health` | Health check |
| POST   | `/upload` | Multipart upload: `file`, `prompt`, optional `language` (`en`/`ja`), `agentIds` (JSON array), `referenceFile` (for Record Match) |
| GET    | `/documents` | List documents |
| GET    | `/documents/:id` | Get document metadata and extracted data |
| GET    | `/documents/:id/file` | Download or view the original file |
| DELETE | `/documents/:id` | Delete a document |
| GET    | `/prompts` | Prompt templates and custom prompts (`?language=ja` for translations) |
| POST   | `/prompts` | Save a custom prompt |
| POST   | `/llm/chat` | Ask a question across documents: `{ query, language, documentIds? }`. `documentIds` limits the question to those documents |
| GET    | `/alfresco/test` | Test Alfresco connection |
| POST   | `/alfresco/export/:documentId` | Export one document |
| POST   | `/alfresco/export-all` | Export all documents |
| GET    | `/alfresco/list` | List nodes at the top level of the site's document library |
| GET    | `/alfresco/status` | `{ configured, connected, site }` |
| GET    | `/alfresco/documents?query=&page=&pageSize=` | Search or list the site's documents (including subfolders), paged |
| GET    | `/alfresco/documents/:nodeId` | One document (only inside the site's document library) |
| GET    | `/alfresco/documents/:nodeId/content` | Stream the document's file |
| POST   | `/alfresco/chat` | Ask about Alfresco documents: `{ query, language, nodeIds?, searchQuery? }`. `nodeIds` limits to those documents, `searchQuery` to that search's results, and neither searches the site for the question |

## Troubleshooting

- **"Could not connect to Ollama"**: make sure `ollama serve` is running and that `OLLAMA_URL` points to it.
- **"No models found in Ollama"**: run `ollama pull gemma3`.
- **Images or scanned PDFs return nothing useful**: check that a vision-capable model is installed and selected (the backend logs which model it chose at startup), and that `pdftoppm` is on your `PATH`.
- **Alfresco export fails**: run `GET /api/alfresco/test`, check the three `ALFRESCO_*` variables, and confirm that a site with the id `demo` (or `ALFRESCO_SITE`) exists.

## License

Licensed under the Apache License 2.0 — see LICENSE.
