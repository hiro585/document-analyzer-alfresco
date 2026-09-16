# Document Analyzer - Local AI Document Processing

A privacy-first web application for analyzing documents (PDFs and images) using local LLM (Ollama). Extract structured information using customizable prompts, search documents by keywords, and chat with your documents.

## Features

- 📤 **Drag & Drop Upload** - Upload PDFs and images easily
- 🤖 **Local AI Processing** - Uses Ollama (runs entirely local, no API costs)
- 📋 **Customizable Extraction** - Configure prompts for different document types
- 📚 **Document Library** - Browse all uploaded documents and their extracted data
- 🔍 **Keyword Search** - Find documents quickly by filename, data, or keywords
- 💬 **Chat Interface** - Ask questions about your documents using LLM
- 💾 **Local Storage** - All files and data stored locally in JSON format

## Prerequisites

- Node.js v18+ ([download](https://nodejs.org))
- Ollama ([download from ollama.ai](https://ollama.ai))

## Setup Instructions

### 1. Install Ollama and Download a Model

```bash
# Download and install Ollama from https://ollama.ai
# Then download a model (Mistral recommended for speed):
ollama run mistral
# Or use Llama 2:
ollama run llama2
```

Ollama will start a server on `http://localhost:11434`

### 2. Install Dependencies

```bash
# Install backend and frontend dependencies
npm install

# Or install separately:
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Start the Application

**Option 1: Run both servers from root**

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

**Option 2: Run separately**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access the Application

Open your browser to `http://localhost:5173`

## Usage

### Uploading Documents

1. Go to **📤 Upload** tab
2. Drag and drop a PDF or image, or click to select
3. Choose an extraction prompt from templates or write a custom one
4. Click **🚀 Upload & Analyze**
5. Wait for the LLM to process and extract data

### Extraction Prompt Examples

- **Extract Numbers**: "Extract all numbers, amounts, and numerical values from this document."
- **Extract Names**: "Find and extract all names of people and organizations mentioned in this document."
- **Summarize**: "Provide a concise summary of the main content of this document."
- **Invoice Details**: "Extract invoice number, date, total amount, vendor name, and line items from this invoice."
- **Receipt Data**: "From this receipt, extract store name, date, items purchased, and total amount paid."

### Searching Documents

1. Go to **🔍 Search & Chat** tab
2. **Keyword Search**: Type filename, extracted data, or keywords to find documents
3. **Chat**: Click **💬 Ask Questions** to ask semantic questions about all your documents

### Managing Documents

1. Go to **📚 Documents** tab
2. View all uploaded documents
3. Click a document to see full details and extracted data
4. Click **🗑️** to delete a document

## Project Structure

```
Project01/
├── backend/                    # Node.js/Express server
│   ├── src/
│   │   ├── index.ts           # Express server entry
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic (Ollama, storage, search)
│   │   └── types/             # TypeScript types
│   ├── data/                  # Local storage (JSON files)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # React/Vite app
│   ├── src/
│   │   ├── App.tsx           # Main component
│   │   ├── pages/            # Upload, Documents, Search pages
│   │   ├── components/       # Reusable UI components
│   │   ├── api/              # Backend API client
│   │   └── styles/           # TailwindCSS styles
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file and extract data |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:id` | Get document details |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/search` | Keyword search |
| POST | `/api/llm/chat` | Chat across all documents |
| GET | `/api/prompts` | Get prompt templates |
| POST | `/api/prompts` | Save custom prompt |

## Local Storage Format

Documents are stored in `backend/data/`:

```
backend/data/
├── documents/
│   └── {uuid}/
│       ├── metadata.json      # Document metadata and extracted data
│       ├── original.pdf       # Original file
│       └── thumbnail.jpg      # Generated thumbnail
├── prompts.json               # Prompt templates and custom prompts
└── index.json                 # Search index (keywords → doc IDs)
```

Example metadata.json:
```json
{
  "id": "doc-uuid",
  "filename": "invoice.pdf",
  "uploadedAt": "2026-09-14T10:00:00Z",
  "originalPrompt": "Extract invoice details",
  "extractedData": {
    "invoice_number": "INV-2026-001",
    "date": "2026-09-14",
    "total_amount": "$1,250.00"
  },
  "fileType": "pdf",
  "keywords": ["invoice", "2026", "1250"]
}
```

## Troubleshooting

### "Could not connect to Ollama"
- Make sure Ollama is running: `ollama run mistral`
- Check that it's accessible at `http://localhost:11434`

### "No models found in Ollama"
- Download a model: `ollama run mistral` or `ollama run llama2`
- Wait for the download to complete

### Slow extraction
- This is normal on CPU-only systems. GPU acceleration helps significantly.
- Try a faster model like Mistral instead of Llama 2

### Upload fails silently
- Check browser console (F12) for error messages
- Check backend logs for detailed errors
- Ensure file size is under 50MB

### Search returns no results
- Keywords are generated from filename and extracted data
- Try searching by filename or exact terms from the extracted data

## Performance Tips

1. **Use Mistral** - Faster inference than Llama 2
2. **GPU Acceleration** - Ollama uses GPU if available (much faster)
3. **Keep Prompts Concise** - Shorter prompts = faster extraction
4. **Smaller Files** - Split large PDFs before uploading

## Development

### Build for Production

```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build
```

### Run Tests (optional, not yet implemented)

```bash
npm test
```

## Roadmap

- [ ] Batch upload multiple files
- [ ] PDF table extraction
- [ ] Export results to CSV/JSON
- [ ] Support for Claude API as optional fallback
- [ ] Multi-user authentication
- [ ] Document versioning and re-extraction with new prompts
- [ ] Advanced search with filters
- [ ] OCR for scanned documents

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Check browser console (F12) and backend logs
3. Make sure Ollama is running and models are downloaded
