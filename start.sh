#!/bin/bash

echo "🚀 Starting Document Analyzer..."
echo ""
echo "📋 Prerequisites:"
echo "  ✓ Ollama must be running with a vision model: ollama pull gemma3"
echo "  ✓ Node.js v18+"
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install && npm run setup
fi

echo ""
echo "🔄 Starting servers..."
echo "  Backend: http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""

npm run dev
