import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api/client';
import { UploadZone } from '../components/UploadZone';
import { PromptEditor } from '../components/PromptEditor';
import { ResultsDisplay } from '../components/ResultsDisplay';
export const Upload = ({ onDocumentUploaded }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [error, setError] = useState(null);
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const handleFilesSelected = (files) => {
        if (files.length > 0) {
            setSelectedFile(files[0]);
            setError(null);
            setExtractedData(null);
        }
    };
    const handlePromptChange = (newPrompt) => {
        setPrompt(newPrompt);
    };
    const handleUpload = async () => {
        if (!selectedFile || !prompt.trim()) {
            setError('Please select a file and enter a prompt');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await api.uploadFile(selectedFile, prompt);
            setExtractedData(result.document.extractedData);
            setUploadedDoc(result.document);
            setSelectedFile(null);
            setExportSuccess(false);
            onDocumentUploaded?.();
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Upload failed. Is Ollama running?';
            setError(errorMsg);
            console.error('Upload error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleExportToAlfresco = async () => {
        if (!uploadedDoc)
            return;
        setExporting(true);
        try {
            const result = await api.exportDocumentToAlfresco(uploadedDoc.id);
            if (result.success) {
                setExportSuccess(true);
                // Update uploadedDoc with Alfresco info
                setUploadedDoc({
                    ...uploadedDoc,
                    alfrescoNodeId: result.data.nodeId,
                    alfrescoExportedAt: new Date().toISOString(),
                });
            }
            else {
                setError(`Failed to export: ${result.error}`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        }
        finally {
            setExporting(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white p-6 rounded-lg border border-gray-200", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800 mb-4", children: "\uD83D\uDCE4 Upload & Analyze" }), _jsx(UploadZone, { onFilesSelected: handleFilesSelected, disabled: loading }), selectedFile && (_jsx("div", { className: "mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg", children: _jsxs("p", { className: "text-sm text-blue-800", children: ["\u2713 Selected: ", _jsx("strong", { children: selectedFile.name })] }) })), _jsx("div", { className: "mt-6", children: _jsx(PromptEditor, { onPromptChange: handlePromptChange, disabled: loading }) }), _jsx("button", { onClick: handleUpload, disabled: !selectedFile || !prompt.trim() || loading, className: "mt-6 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg disabled:bg-gray-400 transition-colors", children: loading ? '⏳ Analyzing...' : '🚀 Upload & Analyze' }), error && (_jsx("div", { className: "mt-4 p-4 bg-red-50 border border-red-200 rounded-lg", children: _jsxs("p", { className: "text-sm text-red-800", children: ["\u274C ", error] }) }))] }), extractedData && (_jsxs("div", { children: [_jsx(ResultsDisplay, { data: extractedData }), uploadedDoc && (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "p-4 bg-green-50 border border-green-200 rounded-lg", children: _jsxs("p", { className: "text-sm text-green-800", children: ["\u2713 Document uploaded successfully! ID: ", uploadedDoc.id] }) }), uploadedDoc.alfrescoNodeId ? (_jsxs("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg", children: [_jsxs("p", { className: "text-sm text-blue-800", children: ["\u2705 ", _jsx("strong", { children: "Exported to Alfresco" })] }), _jsxs("p", { className: "text-sm text-blue-700", children: ["Node ID: ", uploadedDoc.alfrescoNodeId] })] })) : (_jsx("button", { onClick: handleExportToAlfresco, disabled: exporting, className: "w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors", children: exporting ? '⏳ Exporting to Alfresco...' : '📤 Export to Alfresco' }))] }))] }))] }));
};
//# sourceMappingURL=Upload.js.map