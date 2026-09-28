# Alfresco REST API Integration Guide

## Overview

This integration allows you to export AI-analyzed document data directly to Alfresco document management system via REST API.

## Architecture

The integration consists of:
1. **AlfrescoService** (`backend/src/services/alfresco.ts`) - Handles authentication and API calls to Alfresco
2. **Alfresco Export Route** (`backend/src/routes/alfresco-export.ts`) - Provides HTTP endpoints for exporting documents
3. **Configured Endpoints** - Main server integrated with Alfresco export routes

## Configuration

### Environment Variables

Set these environment variables to configure Alfresco connection (in `.env` file):

```bash
# Alfresco API endpoint
ALFRESCO_URL=http://alfrescourl/alfresco/api/-default-/public/alfresco/versions/1

# Alfresco credentials
ALFRESCO_USERNAME=user
ALFRESCO_PASSWORD=password
```

The application requires these variables to be set before starting. See `.env.example` for the template.

## API Endpoints

### 1. Test Alfresco Connection
```
GET /api/alfresco/test
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to Alfresco successfully"
}
```

### 2. Export Single Document to Alfresco
```
POST /api/alfresco/export/:documentId
```

**Parameters:**
- `documentId` - UUID of the document to export

**Response:**
```json
{
  "success": true,
  "message": "Document exported to Alfresco",
  "data": {
    "success": true,
    "nodeId": "8f5... (Alfresco node ID)",
    "filename": "document.pdf",
    "message": "Document data stored successfully in Alfresco"
  }
}
```

### 3. Export All Documents to Alfresco
```
POST /api/alfresco/export-all
```

**Response:**
```json
{
  "success": true,
  "exported": 5,
  "failed": 0,
  "results": [
    {
      "success": true,
      "nodeId": "...",
      "filename": "doc1.pdf",
      "message": "Document data stored successfully in Alfresco"
    }
  ]
}
```

### 4. List Exported Documents in Alfresco
```
GET /api/alfresco/list
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "documents": [
    {
      "id": "8f5...",
      "name": "doc1-metadata.json",
      "createdAt": "2026-09-16T10:00:00.000Z",
      "modifiedAt": "2026-09-16T10:00:00.000Z"
    }
  ]
}
```

## Data Structure

When a document is exported to Alfresco, the following data is stored:

**Alfresco Node Properties:**
- `cm:title` - Original document filename
- `cm:description` - Analysis prompt used

**Stored JSON Content (`metadata.json`):**
```json
{
  "filename": "invoice.pdf",
  "uploadedAt": "2026-09-16T10:00:00Z",
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

## Testing with cURL

### 1. Test Connection
```bash
curl -X GET http://localhost:3001/api/alfresco/test
```

### 2. Export Single Document
```bash
# First, list documents to get an ID
curl -X GET http://localhost:3001/api/documents

# Then export it
curl -X POST http://localhost:3001/api/alfresco/export/{documentId}
```

### 3. Export All Documents
```bash
curl -X POST http://localhost:3001/api/alfresco/export-all
```

### 4. List Exported Documents
```bash
curl -X GET http://localhost:3001/api/alfresco/list
```

## Testing with Frontend

You can add a button in the frontend to trigger exports:

```typescript
// Export single document
async function exportToAlfresco(documentId: string) {
  const response = await fetch(`/api/alfresco/export/${documentId}`, {
    method: 'POST',
  });
  const data = await response.json();
  console.log('Export result:', data);
}

// Export all documents
async function exportAllToAlfresco() {
  const response = await fetch('/api/alfresco/export-all', {
    method: 'POST',
  });
  const data = await response.json();
  console.log('Export all result:', data);
}
```

## How It Works

1. **Authenticate**: Service connects to Alfresco using provided credentials and obtains a ticket
2. **Create Node**: Creates a new document node in Alfresco with metadata
3. **Store Data**: Uploads the extracted analysis data as JSON content to the node
4. **Return Result**: Returns the Alfresco node ID and status

## Troubleshooting

### "Authentication failed"
- Verify Alfresco is running and accessible
- Check username and password are correct
- Ensure API endpoint URL is correct

### "Connection test failed"
- Check your network connection to Alfresco
- Verify the Alfresco URL is accessible
- Check firewall/proxy settings

### "Failed to connect to Alfresco"
- Ensure Alfresco service is running
- Check if the trial instance is still active
- Verify credentials haven't expired

## Security Considerations

- Credentials are read from environment variables
- Use HTTPS in production
- Don't hardcode credentials in code
- Store credentials in secure environment variable management system
- Consider implementing OAuth2 for production use

## Future Enhancements

- [ ] Upload original files to Alfresco (not just metadata)
- [ ] Support for custom Alfresco folder paths
- [ ] Batch operations with progress tracking
- [ ] OAuth2 authentication support
- [ ] Automatic sync on document upload
- [ ] Document version management
