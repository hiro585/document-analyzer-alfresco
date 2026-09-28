# Quick Start: Alfresco Export Feature

## ⚡ 5-Minute Setup

### Step 1: Start the Backend Server
```bash
cd /home/demo/Project02
npm run dev
```

You should see:
```
Server running on http://localhost:3001
Storage initialized
Using LLM model: llava (or similar)
```

### Step 2: Start the Frontend (New Terminal)
```bash
cd /home/demo/Project02/frontend
npm run dev
```

You should see:
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Step 3: Open Browser
Navigate to: **http://localhost:5173**

## 🎬 Test the Feature (2 Minutes)

### Option A: Export Right After Upload

1. Click **📤 Upload & Analyze** tab
2. Drag and drop any PDF or image
3. Select prompt or write your own (e.g., "Extract all text")
4. Click **🚀 Upload & Analyze**
5. Wait for analysis to complete (may take 10-30 seconds)
6. Click **📤 Export to Alfresco** button
7. See confirmation: **✅ Exported to Alfresco**

### Option B: Export from Documents List

1. Click **📚 Documents** tab
2. Click on any document card
3. Click **📤 Export to Alfresco** button
4. Document status updates to: **✅ Exported to Alfresco on [date]**

### Option C: Bulk Export All

1. Click **📚 Documents** tab
2. Click **📤 Export All to Alfresco** button
3. Confirm the action
4. All documents export at once
5. Summary shows: "Exported X documents"

## ✅ Verify It Works

### In the UI
- ✅ See green "✅ In Alfresco" badge on document cards
- ✅ See Alfresco export date in document details
- ✅ See "✅ Exported to Alfresco on [date]" message

### In Terminal
- Check backend logs for: `✓ Created document in Alfresco`
- Check backend logs for: `✓ Authenticated with Alfresco`

### In Alfresco (Optional)
Visit: http://alfrescourl (with your credentials)
- Look for documents named: `{document-id}-metadata.json`
- These contain your extracted data

## 📊 What Gets Stored

### Local Storage (Preserved)
✅ Original file  
✅ Extracted data  
✅ Metadata  
✅ Thumbnail (for images)  

### Alfresco Storage (New)
✅ Extracted data as JSON  
✅ Metadata properties  
✅ Analysis prompt  
✅ Keywords  

## 🐛 Troubleshooting

### "Export button is disabled"
- Check that backend is running (`npm run dev`)
- Check that document has finished analyzing

### "Export failed" error
- Make sure Alfresco is accessible (check your internet)
- Verify backend logs for detailed error
- Try reloading the page

### "Document doesn't show ✅ status"
- Refresh the browser (F5)
- Check backend console for errors
- Try exporting again

### "Alfresco Node ID not showing"
- Wait a moment and refresh
- Check if export actually succeeded in backend logs
- Try exporting again

## 📚 Full Documentation

- **User Guide**: `ALFRESCO_UI_GUIDE.md` - Complete feature walkthrough
- **Integration Details**: `ALFRESCO_INTEGRATION.md` - Technical details
- **Implementation**: `IMPLEMENTATION_SUMMARY_V2.md` - What was changed

## 🎯 Key Points

✅ **Local files are always kept** - No deletion when exporting  
✅ **Export anytime** - Can export immediately after upload or later  
✅ **Bulk operations** - Export all documents at once  
✅ **Track status** - See which documents are in Alfresco  
✅ **No configuration needed** - Works with user/password credentials  

## 🚀 Next Steps

After verifying the feature works:

1. **Test with your own documents**:
   - Upload invoices, receipts, or contracts
   - Try different extraction prompts
   - Export to Alfresco
   - Verify data appears correctly

2. **Customize if needed**:
   - Edit Alfresco credentials in `backend/src/routes/alfresco-export.ts`
   - Change API endpoint if using different server
   - Add more metadata fields

3. **Deploy to production**:
   - Build: `npm run build` in both backend and frontend
   - Set environment variables for Alfresco credentials
   - Deploy to your server

## 💡 Tips

- **Bulk is faster**: Export 10 documents at once rather than one by one
- **Check status**: Click document card to see Alfresco export status
- **Re-export**: You can export same document multiple times
- **No deletion link**: Exporting doesn't affect local storage
- **Date tracking**: Export timestamp shows when document was sent to Alfresco

## 🔗 Links

- **Frontend UI**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Alfresco Server**: http://alfrescourl

---

**Ready?** Start the servers and upload your first document! 🚀
