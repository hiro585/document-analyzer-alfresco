# Quick Start Guide

## 1️⃣ Prerequisites

### Install Ollama
- Download from [ollama.ai](https://ollama.ai)
- Install and start Ollama
- Run a model: `ollama run mistral` (recommended for speed)

Ollama will start on `http://localhost:11434`

### Check Node.js Version
```bash
node --version  # Should be v18 or higher
npm --version
```

## 2️⃣ One-Line Setup & Start

```bash
# Navigate to project directory
cd /home/demo/Project01

# Install dependencies and start both servers
npm install && npm run dev
```

Or use the convenience script:
```bash
./start.sh
```

## 3️⃣ Access the App

Open your browser to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/health (should return `{"status":"ok"}`)

## 4️⃣ Try It Out

1. **Upload a Document**
   - Go to "📤 Upload" tab
   - Drag and drop a PDF or image
   - Select a prompt template (e.g., "Extract Numbers")
   - Click "🚀 Upload & Analyze"

2. **View Documents**
   - Go to "📚 Documents" tab
   - See all uploaded documents and extracted data

3. **Search & Chat**
   - Go to "🔍 Search & Chat" tab
   - Try keyword search on "invoice", "document name", etc.
   - Click "💬 Ask Questions" to chat with your documents using AI

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Check backend logs
cd backend && npm run dev
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Check frontend logs
cd frontend && npm run dev
```

### "Could not connect to Ollama"
- Make sure Ollama is running: `ollama run mistral`
- Check Ollama is on http://localhost:11434
- Try: `curl http://localhost:11434/api/tags`

### "No models found in Ollama"
- Download a model: `ollama run mistral`
- Wait for download to complete (might take a while)

## 📁 Project Structure

```
Project01/
├── backend/          # Express.js server (port 3001)
│   ├── src/
│   │   ├── services/ # Ollama, file processing, storage, search
│   │   ├── routes/   # API endpoints
│   │   └── types/    # TypeScript types
│   └── data/         # Document storage (JSON files)
├── frontend/         # React app (port 5173)
│   ├── src/
│   │   ├── pages/    # Upload, Documents, Search views
│   │   ├── components/ # Reusable UI components
│   │   └── api/      # Backend client
└── README.md         # Full documentation
```

## 🚀 Next Steps

- Read full README.md for detailed documentation
- Check plan file at: `../.claude/plans/virtual-hatching-backus.md`
- Explore backend API at: http://localhost:3001/api/

## 💡 Tips

- **Faster Extraction**: Use Mistral model instead of Llama 2
- **Better Results**: Write specific extraction prompts
- **Local Only**: All data stays on your machine!

---

Happy analyzing! 🎉
