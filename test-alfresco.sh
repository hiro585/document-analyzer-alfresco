#!/bin/bash

# Test script for Alfresco REST API integration
# Usage: ./test-alfresco.sh

API_URL="http://localhost:3001"
ALFRESCO_URL="http://alfrescourl/alfresco/api/-default-/public/alfresco/versions/1"

echo "🧪 Testing Alfresco Integration"
echo "================================"
echo ""

# Check if server is running
echo "1️⃣  Checking if backend server is running..."
if ! curl -s "$API_URL/api/health" > /dev/null; then
    echo "❌ Backend server not running on $API_URL"
    echo "   Please run: npm run dev"
    exit 1
fi
echo "✅ Backend server is running"
echo ""

# Test Alfresco connection
echo "2️⃣  Testing Alfresco connection..."
response=$(curl -s -X GET "$API_URL/api/alfresco/test")
echo "Response: $response"
if echo "$response" | grep -q '"success":true'; then
    echo "✅ Connected to Alfresco successfully"
else
    echo "❌ Failed to connect to Alfresco"
    echo "   Check your credentials and URL"
    exit 1
fi
echo ""

# List documents
echo "3️⃣  Listing uploaded documents..."
documents=$(curl -s -X GET "$API_URL/api/documents")
doc_count=$(echo "$documents" | grep -o '"id"' | wc -l)
echo "Found $doc_count documents"
if [ "$doc_count" -eq 0 ]; then
    echo "⚠️  No documents found. Upload some documents first."
    echo "   Go to http://localhost:5173 and upload documents"
    exit 0
fi
echo ""

# Get first document ID
doc_id=$(echo "$documents" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "4️⃣  First document ID: $doc_id"
echo ""

# Export single document
echo "5️⃣  Exporting single document to Alfresco..."
export_response=$(curl -s -X POST "$API_URL/api/alfresco/export/$doc_id")
echo "Response: $export_response"
if echo "$export_response" | grep -q '"success":true'; then
    echo "✅ Successfully exported document"
    node_id=$(echo "$export_response" | grep -o '"nodeId":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Alfresco Node ID: $node_id"
else
    echo "❌ Failed to export document"
fi
echo ""

# List exported documents
echo "6️⃣  Listing documents in Alfresco..."
list_response=$(curl -s -X GET "$API_URL/api/alfresco/list")
echo "Response: $list_response"
count=$(echo "$list_response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "✅ Found $count documents in Alfresco"
echo ""

echo "================================"
echo "🎉 All tests completed!"
echo ""
echo "Next steps:"
echo "- Review exported data in Alfresco at: $ALFRESCO_URL"
echo "- Integrate export button into your UI"
echo "- Configure credentials in environment variables"
