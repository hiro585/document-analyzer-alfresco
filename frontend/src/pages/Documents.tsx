import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentListView } from '../components/DocumentListView';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentsPageProps {
  refreshTrigger?: number;
}

type ViewMode = 'thumbnail' | 'list';

export const Documents: React.FC<DocumentsPageProps> = ({ refreshTrigger }) => {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'thumbnail';
    return (localStorage.getItem('documentsViewMode') as ViewMode) || 'thumbnail';
  });

  useEffect(() => {
    localStorage.setItem('documentsViewMode', viewMode);
  }, [viewMode]);

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
    if (!confirm(t('documents.delete.confirm'))) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      setSelectedDoc(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleExportToAlfresco = async (docId: string) => {
    setExporting(docId);
    try {
      const result = await api.exportDocumentToAlfresco(docId);
      if (result.success) {
        setExportStatus(prev => ({
          ...prev,
          [docId]: `✅ Exported to Alfresco (Node: ${result.data.nodeId})`,
        }));
        // Update selected document
        setSelectedDoc(prev =>
          prev?.id === docId
            ? { ...prev, alfrescoNodeId: result.data.nodeId, alfrescoExportedAt: new Date().toISOString() }
            : prev
        );
        // Refresh documents list
        setTimeout(loadDocuments, 1000);
      } else {
        setExportStatus(prev => ({
          ...prev,
          [docId]: `❌ Export failed: ${result.error}`,
        }));
      }
    } catch (error) {
      setExportStatus(prev => ({
        ...prev,
        [docId]: `❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    if (!confirm(`Export all ${documents.length} documents to Alfresco?`)) return;
    setExporting('all');
    try {
      const result = await api.exportAllToAlfresco();
      if (result.success) {
        alert(`✅ Exported ${result.exported} documents to Alfresco`);
        if (result.failed > 0) {
          alert(`⚠️ ${result.failed} documents failed to export`);
        }
        // Refresh documents list
        loadDocuments();
      }
    } catch (error) {
      alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{t('documents.heading')}</h2>
          <div className="space-x-2 flex items-center">
            <div className="flex border border-gray-300 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('thumbnail')}
                title={t('documents.view.thumbnail')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'thumbnail' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                title={t('documents.view.list')}
                className={`px-3 py-1 text-sm border-l border-gray-300 ${
                  viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                ☰
              </button>
            </div>
            <button
              onClick={loadDocuments}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
            >
              🔄 Refresh
            </button>
            {documents.length > 0 && (
              <button
                onClick={handleExportAll}
                disabled={exporting === 'all'}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-sm"
              >
                {exporting === 'all' ? '⏳ Exporting...' : '📤 Export All to Alfresco'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">{t('documents.loading')}</p>
        ) : documents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('documents.empty')}</p>
        ) : viewMode === 'thumbnail' ? (
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
        ) : (
          <DocumentListView documents={documents} onDelete={handleDelete} onClick={setSelectedDoc} />
        )}
      </div>

      {selectedDoc && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">{selectedDoc.filename}</h3>
              {selectedDoc.alfrescoNodeId && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ Exported to Alfresco on {new Date(selectedDoc.alfrescoExportedAt).toLocaleString()}
                </p>
              )}
            </div>
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

            {exportStatus[selectedDoc.id] && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                {exportStatus[selectedDoc.id]}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {!selectedDoc.alfrescoNodeId && (
                <button
                  onClick={() => handleExportToAlfresco(selectedDoc.id)}
                  disabled={exporting === selectedDoc.id}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded"
                >
                  {exporting === selectedDoc.id ? '⏳ Exporting...' : '📤 Export to Alfresco'}
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedDoc.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
