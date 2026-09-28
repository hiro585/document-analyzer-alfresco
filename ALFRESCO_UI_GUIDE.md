# Alfresco Integration - User Guide

This guide explains how to export your analyzed documents to Alfresco directly from the web interface while maintaining your local storage.

## 🎯 Features

✅ **Local Storage Maintained** - All documents are kept in local storage  
✅ **Export to Alfresco** - Send analyzed data to Alfresco repository  
✅ **Track Status** - See which documents are exported to Alfresco  
✅ **Batch Export** - Export all documents at once  
✅ **Direct Export from Upload** - Export right after analyzing a document  

## 🚀 Quick Start

### 1. Upload & Analyze a Document

1. Go to **📤 Upload & Analyze** tab
2. Drag and drop a PDF or image
3. Select or write an extraction prompt
4. Click **🚀 Upload & Analyze**
5. Wait for AI analysis to complete

### 2. Export to Alfresco (After Upload)

After a document is successfully analyzed:

1. You'll see the success message with document ID
2. Click **📤 Export to Alfresco** button
3. Wait for export to complete
4. You'll see confirmation: **✅ Exported to Alfresco** with Node ID

### 3. Export from Documents Page

Go to **📚 Documents** tab to see all uploaded documents:

#### Option A: Export Single Document
1. Click on a document card to view details
2. In the details panel, click **📤 Export to Alfresco** button
3. Document will be exported and status will update to ✅

#### Option B: Export All Documents
1. Click **📤 Export All to Alfresco** button in the top right
2. Confirm the bulk export
3. All documents will be exported
4. You'll see success count and any failures

## 📊 Understanding the UI

### Document Card (In Grid View)

```
┌─────────────────────┐
│ 🖼️ image.jpg        │
│ Uploaded: 09/16     │
│                     │
│ Prompt: Extract ... │
│ Extracted:          │
│ - field1: value     │
│ - field2: value     │
│                     │
│ ✅ In Alfresco      │
│    Exported: 09/16  │
└─────────────────────┘
```

**Status Indicators:**
- 🖼️ = Image file | 📄 = PDF file | 📝 = Text file
- ✅ In Alfresco = Document has been exported
- Export date shown below status

### Document Details (After Clicking Card)

When you click a document, you see:
- Document filename and metadata
- Extraction prompt used
- Full extracted data
- All keywords
- **Export Status**: Shows if exported and when
- **📤 Export to Alfresco**: Button to export (if not already exported)
- **🗑️ Delete**: Button to delete document

## 💾 Data Storage

### Local Storage
- All documents remain in `backend/data/documents/{id}/`
- Includes: metadata.json, original file, thumbnail
- Accessible through the UI at all times

### Alfresco Storage
- Extracted data exported as JSON metadata
- Stored in Alfresco repository
- Node ID saved to local document record
- Can be accessed via Alfresco UI

## 🔄 What Gets Exported?

When you export a document to Alfresco, the following data is sent:

```json
{
  "filename": "invoice.pdf",
  "uploadedAt": "2026-09-16T10:00:00Z",
  "originalPrompt": "Extract invoice details",
  "extractedData": {
    "invoice_number": "INV-001",
    "total_amount": "$1,000",
    "date": "2026-09-16"
  },
  "fileType": "pdf",
  "keywords": ["invoice", "001", "1000"]
}
```

**Alfresco Properties Set:**
- `cm:title` → Original filename
- `cm:description` → Analysis prompt used

## 📋 Common Workflows

### Workflow 1: Upload → Analyze → Export (Single Document)
```
1. Upload & Analyze tab
2. Select file and prompt
3. Click Upload & Analyze
4. Click Export to Alfresco (after upload completes)
5. Document now in both local and Alfresco
```

### Workflow 2: Bulk Export Existing Documents
```
1. Go to Documents tab
2. Review all uploaded documents
3. Click Export All to Alfresco
4. Confirm bulk export
5. All documents sent to Alfresco
```

### Workflow 3: Selective Export
```
1. Go to Documents tab
2. Click individual documents
3. Review extracted data
4. Click Export to Alfresco for selected ones
5. Leave others in local storage only
```

## ✅ Checking Export Status

### In Documents Grid
- Look for **✅ In Alfresco** badge on document cards
- Shows export date below status

### In Document Details
- Green confirmation message at top: **✅ Exported to Alfresco on [date]**
- Alfresco Node ID displayed
- Export button hidden (document already exported)

### In Alfresco Directly
Access http://alfrescourl/alfresco/api/-default-/public/alfresco/versions/1 to:
- View exported documents
- Check metadata
- Access extracted data
- Verify successful export

## 🐛 Troubleshooting

### "Export Failed" Message

**Problem**: Export button shows error
**Solution**: 
1. Check Alfresco server is accessible
2. Verify credentials (user/password)
3. Check internet connection
4. Try exporting a different document

### "Alfresco Node ID not showing"

**Problem**: Document doesn't show ✅ status
**Solution**:
1. Refresh the page
2. Try exporting again
3. Check browser console (F12) for errors

### "Exported, but can't see in Alfresco"

**Problem**: Document shows as exported but not visible in Alfresco UI
**Solution**:
1. Log into Alfresco directly
2. Check the root folder for metadata.json files
3. Metadata is stored as JSON files, not the original files
4. File name format: `{document-id}-metadata.json`

## 🔒 Security Notes

- Alfresco credentials (demo/demo) are used for all exports
- Data is transmitted over HTTPS
- Both local and Alfresco copies contain the same data
- Deleting locally does NOT delete from Alfresco

## 📱 Mobile Friendly

- All buttons and UI are responsive
- Works on tablets and phones
- Touch-friendly export buttons
- Status updates in real-time

## 🎓 Example: Complete Workflow

1. **Upload invoice.pdf** → Analyze with "Extract invoice details"
2. **See results** → Invoice number, date, amount all extracted
3. **Export to Alfresco** → Click export button after upload
4. **Confirm** → See "✅ Exported to Alfresco" confirmation
5. **View in both places**:
   - Local: Documents tab shows the card with ✅ badge
   - Alfresco: `invoice.pdf-metadata.json` available in Alfresco

## 📞 Need Help?

- Check the backend logs: `npm run dev` shows all API calls
- Use browser DevTools (F12) to see API responses
- Test connection with: `curl -X GET http://localhost:3001/api/alfresco/test`
- Verify Alfresco is running before exporting

---

**Tip**: You can export the same document multiple times - it will update the Alfresco node each time!
