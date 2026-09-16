# Complete File Structure

## Root Level
```
/home/demo/Project01/
├── README.md                    # Full documentation
├── QUICK_START.md              # Quick start guide  
├── IMPLEMENTATION_SUMMARY.md   # What was built
├── FILE_STRUCTURE.md           # This file
├── start.sh                    # Startup script
├── package.json                # Root monorepo package.json
└── .gitignore                  # Git ignore rules
```

## Backend Structure
```
backend/
├── package.json                # Backend dependencies
├── package-lock.json           # Locked dependency versions
├── tsconfig.json               # TypeScript configuration
├── src/                        # TypeScript source files
│   ├── index.ts                # Express server entry point
│   │   └── Starts server on port 3001
│   │   └── Initializes storage and Ollama
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   │       ├── Document interface
│   │       ├── ExtractedData interface
│   │       ├── Prompt interface
│   │       ├── PromptStore interface
│   │       └── SearchIndex interface
│   ├── services/               # Business logic layer
│   │   ├── ollama.ts
│   │   │   ├── OllamaService class
│   │   │   ├── detectModels() - Lists available models
│   │   │   ├── selectModel() - Auto-selects or uses selected model
│   │   │   ├── extractData() - Calls Ollama for extraction
│   │   │   ├── chat() - Semantic search across documents
│   │   │   └── parseExtractedData() - Parses LLM output
│   │   ├── file-processor.ts
│   │   │   ├── FileProcessor class
│   │   │   ├── processImage() - Converts image to base64 + thumbnail
│   │   │   ├── processPDF() - Extracts text from PDF + thumbnail
│   │   │   └── generateSimpleThumbnail() - Creates placeholder thumbnail
│   │   ├── storage.ts
│   │   │   ├── StorageService class
│   │   │   ├── initializeStorage() - Sets up directories & files
│   │   │   ├── saveDocument() - Saves metadata + updates index
│   │   │   ├── loadDocument() - Retrieves document metadata
│   │   │   ├── listDocuments() - Lists all documents
│   │   │   ├── deleteDocument() - Removes document + updates index
│   │   │   ├── saveOriginalFile() - Stores original file
│   │   │   ├── saveThumbnail() - Stores thumbnail
│   │   │   ├── savePrompts/loadPrompts() - Manages prompts
│   │   │   ├── saveIndex/loadIndex() - Manages search index
│   │   │   └── indexDocument() - Updates search index
│   │   └── search.ts
│   │       ├── SearchService class
│   │       ├── keywordSearch() - Searches documents by keywords
│   │       └── getDocumentContext() - Formats document for LLM
│   └── routes/                 # API endpoints
│       ├── upload.ts
│       │   └── POST /api/upload - Upload file and extract data
│       ├── documents.ts
│       │   ├── GET /api/documents - List all documents
│       │   ├── GET /api/documents/:id - Get specific document
│       │   └── DELETE /api/documents/:id - Delete document
│       ├── search.ts
│       │   └── POST /api/search - Keyword search
│       ├── prompts.ts
│       │   ├── GET /api/prompts - Get templates + custom prompts
│       │   └── POST /api/prompts - Save custom prompt
│       └── llm.ts
│           └── POST /api/llm/chat - Chat across documents
├── data/                       # Local storage (auto-created)
│   ├── documents/              # Document storage
│   │   └── {uuid}/
│   │       ├── metadata.json   # Document metadata + extracted data
│   │       ├── original.*      # Original file (PDF or image)
│   │       └── thumbnail.jpg   # Generated thumbnail
│   ├── prompts.json            # Prompt templates + custom prompts
│   └── index.json              # Search index (keywords → doc IDs)
├── dist/                       # Compiled JavaScript (auto-generated)
└── node_modules/               # Dependencies (auto-installed)
```

## Frontend Structure
```
frontend/
├── package.json                # Frontend dependencies
├── package-lock.json           # Locked dependency versions
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.node.json          # TypeScript config for Vite
├── tailwind.config.js          # TailwindCSS configuration
├── postcss.config.js           # PostCSS configuration
├── src/                        # React source files
│   ├── main.tsx                # React entry point (React.createRoot)
│   ├── App.tsx                 # Main App component
│   │   ├── Manages active tab state
│   │   ├── Renders header, navigation, main content, footer
│   │   ├── Handles document refresh trigger
│   │   └── Navigation between Upload/Documents/Search tabs
│   ├── pages/                  # Page components
│   │   ├── Upload.tsx
│   │   │   ├── Upload page with drag-drop zone
│   │   │   ├── Prompt editor with templates
│   │   │   ├── Display extracted results
│   │   │   └── Handle file upload
│   │   ├── Documents.tsx
│   │   │   ├── Display document gallery
│   │   │   ├── Show document details when selected
│   │   │   ├── Delete with confirmation
│   │   │   └── Keywords display
│   │   └── Search.tsx
│   │       ├── Keyword search input
│   │       ├── Display search results
│   │       ├── LLM chat panel
│   │       └── Chat messages display
│   ├── components/             # Reusable UI components
│   │   ├── UploadZone.tsx
│   │   │   ├── Drag-and-drop area
│   │   │   ├── File input (hidden)
│   │   │   ├── Drag active state styling
│   │   │   └── Multiple file support
│   │   ├── PromptEditor.tsx
│   │   │   ├── Prompt templates dropdown
│   │   │   ├── Textarea for custom prompt
│   │   │   ├── Save prompt functionality
│   │   │   └── Prompt suggestions
│   │   ├── ResultsDisplay.tsx
│   │   │   ├── Display extracted data
│   │   │   ├── Loading state
│   │   │   └── Format data for display
│   │   ├── DocumentCard.tsx
│   │   │   ├── Document preview card
│   │   │   ├── Show extracted data preview
│   │   │   ├── Delete button
│   │   │   └── Click handler for details
│   │   ├── SearchBar.tsx
│   │   │   ├── Search input + button
│   │   │   ├── Form submission
│   │   │   └── Disabled state handling
│   │   └── ChatPanel.tsx
│   │       ├── Message history display
│   │       ├── User/assistant message styling
│   │       ├── Loading indicator
│   │       └── Chat input + send button
│   ├── hooks/                  # Custom React hooks (empty for now)
│   ├── api/                    # API client
│   │   └── client.ts
│   │       ├── Axios instance configuration
│   │       ├── uploadFile() - Upload with FormData
│   │       ├── listDocuments() - Get all docs
│   │       ├── getDocument() - Get single doc
│   │       ├── deleteDocument() - Delete doc
│   │       ├── search() - Keyword search
│   │       ├── chat() - LLM chat
│   │       ├── getPrompts() - Get templates
│   │       └── savePrompt() - Save custom prompt
│   └── styles/
│       └── globals.css         # TailwindCSS imports + global styles
├── public/                     # Static assets (empty)
├── dist/                       # Built frontend (auto-generated)
└── node_modules/               # Dependencies (auto-installed)
```

## Key Files by Purpose

### Backend
| File | Purpose | Language |
|------|---------|----------|
| `backend/src/index.ts` | Server setup | TypeScript |
| `backend/src/services/ollama.ts` | LLM integration | TypeScript |
| `backend/src/services/file-processor.ts` | PDF/image processing | TypeScript |
| `backend/src/services/storage.ts` | File I/O & indexing | TypeScript |
| `backend/src/services/search.ts` | Search logic | TypeScript |
| `backend/src/routes/*.ts` | API endpoints (5 files) | TypeScript |
| `backend/src/types/index.ts` | Type definitions | TypeScript |
| `backend/data/documents/{uuid}/metadata.json` | Document metadata | JSON |
| `backend/data/prompts.json` | Prompt templates | JSON |
| `backend/data/index.json` | Search index | JSON |

### Frontend
| File | Purpose | Language |
|------|---------|----------|
| `frontend/src/main.tsx` | React entry | TypeScript/JSX |
| `frontend/src/App.tsx` | Main component | TypeScript/JSX |
| `frontend/src/pages/*.tsx` | Page views (3 files) | TypeScript/JSX |
| `frontend/src/components/*.tsx` | UI components (6 files) | TypeScript/JSX |
| `frontend/src/api/client.ts` | API wrapper | TypeScript |
| `frontend/src/styles/globals.css` | Global styles | CSS |
| `frontend/index.html` | HTML entry | HTML |
| `frontend/vite.config.ts` | Vite config | TypeScript |
| `frontend/tailwind.config.js` | Tailwind config | JavaScript |

## Data Storage Locations

### Backend Data Directory
```
backend/data/
├── documents/
│   └── {auto-generated-uuid}/
│       ├── metadata.json          # ~1-5 KB
│       ├── original.pdf or .jpg   # File size varies
│       └── thumbnail.jpg          # ~2-5 KB
├── prompts.json                   # ~2 KB (grows with custom prompts)
└── index.json                     # Grows with documents
```

### Frontend Assets
- `frontend/dist/` - Production build output
- No frontend data stored (React state only, or localStorage optional)

## File Counts Summary

- **Backend TypeScript files**: 12 files
  - 1 main entry point
  - 4 service files
  - 5 route files
  - 1 type file
  - 1 config (tsconfig)

- **Frontend TypeScript/JSX files**: 11 files
  - 1 main entry
  - 1 App component
  - 3 page components
  - 6 component files
  - 1 API client

- **Configuration files**: 10 files
  - Backend: tsconfig.json, package.json
  - Frontend: tsconfig.json, tsconfig.node.json, vite.config.ts, tailwind.config.js, postcss.config.js, package.json
  - Root: package.json

- **Documentation files**: 4 files
  - README.md, QUICK_START.md, IMPLEMENTATION_SUMMARY.md, FILE_STRUCTURE.md

**Total source code files**: ~27 TypeScript/JavaScript files
**Total project files**: ~50+ files (including configs, docs, and auto-generated)

## How Files Are Used

### When User Uploads a Document
1. `frontend/components/UploadZone.tsx` - File input
2. `frontend/pages/Upload.tsx` - Handles upload
3. `frontend/api/client.ts` - Calls API
4. `backend/routes/upload.ts` - Receives file
5. `backend/services/file-processor.ts` - Processes file
6. `backend/services/ollama.ts` - Calls LLM
7. `backend/services/storage.ts` - Saves to disk
8. Files stored in `backend/data/documents/{uuid}/`

### When User Searches
1. `frontend/pages/Search.tsx` - Search input
2. `frontend/api/client.ts` - Calls API
3. `backend/routes/search.ts` - Handles request
4. `backend/services/search.ts` - Keyword search
5. `backend/services/storage.ts` - Loads index
6. `backend/data/index.json` - Search index

### When User Chats
1. `frontend/components/ChatPanel.tsx` - Chat UI
2. `frontend/api/client.ts` - Calls chat API
3. `backend/routes/llm.ts` - Handles chat
4. `backend/services/storage.ts` - Gets all documents
5. `backend/services/search.ts` - Formats context
6. `backend/services/ollama.ts` - Calls LLM

---

**Last Updated**: 2026-09-14
**Total Lines of Code**: ~2,000+ lines of application code
**Project Status**: Complete and ready to deploy
