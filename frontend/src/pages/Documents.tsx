import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DocumentCard } from '../components/DocumentCard';

interface DocumentsPageProps {
  refreshTrigger?: number;
}

export const Documents: React.FC<DocumentsPageProps> = ({ refreshTrigger }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      setSelectedDoc(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">📚 Documents</h2>
          <button
            onClick={loadDocuments}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No documents yet. Upload one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
                onClick={setSelectedDoc}
              />
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">{selectedDoc.filename}</h3>
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                <strong>Uploaded:</strong> {new Date(selectedDoc.uploadedAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Type:</strong> {selectedDoc.fileType.toUpperCase()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Extraction Prompt:</strong> {selectedDoc.originalPrompt}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Extracted Data:</h4>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                {Object.entries(selectedDoc.extractedData).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-mono text-gray-600">{key}:</span>{' '}
                    <span className="text-gray-800">
                      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Keywords:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDoc.keywords.slice(0, 10).map((kw: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {kw}
                  </span>
                ))}
                {selectedDoc.keywords.length > 10 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    +{selectedDoc.keywords.length - 10} more
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDelete(selectedDoc.id)}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
            >
              🗑️ Delete Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
