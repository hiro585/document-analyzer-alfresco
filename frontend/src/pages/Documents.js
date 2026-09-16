import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DocumentCard } from '../components/DocumentCard';
export const Documents = ({ refreshTrigger }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    useEffect(() => {
        loadDocuments();
    }, [refreshTrigger]);
    const loadDocuments = async () => {
        setLoading(true);
        try {
            const docs = await api.listDocuments();
            setDocuments(docs);
        }
        catch (error) {
            console.error('Failed to load documents:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async (docId) => {
        if (!confirm('Are you sure you want to delete this document?'))
            return;
        try {
            await api.deleteDocument(docId);
            setDocuments(docs => docs.filter(d => d.id !== docId));
            setSelectedDoc(null);
        }
        catch (error) {
            console.error('Failed to delete document:', error);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white p-6 rounded-lg border border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800", children: "\uD83D\uDCDA Documents" }), _jsx("button", { onClick: loadDocuments, className: "px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm", children: "\uD83D\uDD04 Refresh" })] }), loading ? (_jsx("p", { className: "text-center text-gray-500 py-8", children: "Loading documents..." })) : documents.length === 0 ? (_jsx("p", { className: "text-center text-gray-500 py-8", children: "No documents yet. Upload one to get started!" })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: documents.map(doc => (_jsx(DocumentCard, { document: doc, onDelete: handleDelete, onClick: setSelectedDoc }, doc.id))) }))] }), selectedDoc && (_jsxs("div", { className: "bg-white p-6 rounded-lg border border-gray-200", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsx("h3", { className: "text-xl font-bold text-gray-800", children: selectedDoc.filename }), _jsx("button", { onClick: () => setSelectedDoc(null), className: "text-gray-500 hover:text-gray-700 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("strong", { children: "Uploaded:" }), " ", new Date(selectedDoc.uploadedAt).toLocaleString()] }), _jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("strong", { children: "Type:" }), " ", selectedDoc.fileType.toUpperCase()] }), _jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("strong", { children: "Extraction Prompt:" }), " ", selectedDoc.originalPrompt] })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-gray-800 mb-2", children: "Extracted Data:" }), _jsx("div", { className: "bg-gray-50 p-3 rounded-lg space-y-2", children: Object.entries(selectedDoc.extractedData).map(([key, value]) => (_jsxs("div", { className: "text-sm", children: [_jsxs("span", { className: "font-mono text-gray-600", children: [key, ":"] }), ' ', _jsx("span", { className: "text-gray-800", children: typeof value === 'string' ? value : JSON.stringify(value, null, 2) })] }, key))) })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-gray-800 mb-2", children: "Keywords:" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [selectedDoc.keywords.slice(0, 10).map((kw, i) => (_jsx("span", { className: "px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs", children: kw }, i))), selectedDoc.keywords.length > 10 && (_jsxs("span", { className: "px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs", children: ["+", selectedDoc.keywords.length - 10, " more"] }))] })] }), _jsx("button", { onClick: () => handleDelete(selectedDoc.id), className: "w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded", children: "\uD83D\uDDD1\uFE0F Delete Document" })] })] }))] }));
};
//# sourceMappingURL=Documents.js.map