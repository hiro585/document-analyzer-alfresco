import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ChatPanel } from '../components/ChatPanel';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentListView } from '../components/DocumentListView';
import { Pagination } from '../components/Pagination';
import { EvaluationResults } from '../components/EvaluationResults';
import { OcrTextViewer } from '../components/OcrTextViewer';
import { useLanguage } from '../contexts/LanguageContext';
import type { Document } from '../types';

interface DocumentsPageProps {
  refreshTrigger?: number;
}

type ViewMode = 'thumbnail' | 'list';
type ChatScope = 'selected' | 'results' | 'all';

const PAGE_SIZE = 10;
// Matches MAX_DOCUMENTS_FOR_CHAT in backend/src/routes/llm.ts
const MAX_CHAT_DOCUMENTS = 5;
const CHAT_SCOPES: ChatScope[] = ['selected', 'results', 'all'];

// At Tailwind's xl breakpoint the chat is a side column; below it, a slide-over drawer.
const isWideScreen = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

export const Documents: React.FC<DocumentsPageProps> = ({ refreshTrigger }) => {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<Record<string, string>>({});
  const [listCollapsed, setListCollapsed] = useState(false);
  const isCollapsed = listCollapsed && !!selectedDoc;

  const closeDetails = () => {
    setSelectedDoc(null);
    setListCollapsed(false);
  };
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'thumbnail';
    return (localStorage.getItem('documentsViewMode') as ViewMode) || 'thumbnail';
  });

  useEffect(() => {
    localStorage.setItem('documentsViewMode', viewMode);
  }, [viewMode]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 'results' follows the search box: all documents when it's empty.
  const [chatScope, setChatScope] = useState<ChatScope>('results');
  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    if (!isWideScreen()) return false;
    try {
      return localStorage.getItem('documentsChatOpen') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!isWideScreen()) return;
    try {
      localStorage.setItem('documentsChatOpen', String(chatOpen));
    } catch {
      // Storage unavailable; the panel state just won't be remembered.
    }
  }, [chatOpen]);

  // Drop selections for documents that no longer exist (deleted or refreshed away).
  useEffect(() => {
    setSelectedIds(prev => {
      const existing = new Set(documents.map(d => d.id));
      const next = new Set([...prev].filter(id => existing.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [documents]);

  const updateSelection = (next: Set<string>) => {
    // Ticking the first document switches the chat to it, which is almost always the intent.
    if (selectedIds.size === 0 && next.size > 0) setChatScope('selected');
    setSelectedIds(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateSelection(next);
  };

  const setSelected = (ids: string[], selected: boolean) => {
    const next = new Set(selectedIds);
    for (const id of ids) {
      if (selected) next.add(id);
      else next.delete(id);
    }
    updateSelection(next);
  };

  const handleSourceClick = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;
    setSelectedDoc(doc);
    // The drawer covers the page on smaller screens, so get it out of the way.
    if (!isWideScreen()) setChatOpen(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, documents]);

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
      closeDetails();
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
            : prev,
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

  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    if (doc.filename?.toLowerCase().includes(query)) return true;
    if (doc.originalPrompt?.toLowerCase().includes(query)) return true;
    if (doc.keywords?.some((kw: string) => kw.toLowerCase().includes(query))) return true;
    return Object.values(doc.extractedData || {}).some(value => {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      return text.toLowerCase().includes(query);
    });
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasQuery = searchQuery.trim().length > 0;
  const filteredIds = filteredDocuments.map(d => d.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  // Fall back when the chosen scope has nothing in it (no selection / no search).
  const effectiveScope: ChatScope =
    chatScope === 'selected' && selectedIds.size === 0
      ? hasQuery
        ? 'results'
        : 'all'
      : chatScope === 'results' && !hasQuery
        ? 'all'
        : chatScope;

  const scopeCounts: Record<ChatScope, number> = {
    selected: selectedIds.size,
    results: filteredDocuments.length,
    all: documents.length,
  };
  const scopeDisabled: Record<ChatScope, boolean> = {
    selected: selectedIds.size === 0,
    results: !hasQuery,
    all: false,
  };
  const chatDocumentIds =
    effectiveScope === 'selected'
      ? documents.filter(d => selectedIds.has(d.id)).map(d => d.id)
      : effectiveScope === 'results'
        ? filteredIds
        : undefined;
  const chatScopeLabel = t(`chat.scope.used.${effectiveScope}`).replace('{count}', String(scopeCounts[effectiveScope]));

  const chatHeader = (
    <div className="border-b border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{t('chat.heading')}</h3>
        <button
          onClick={() => setChatOpen(false)}
          title={t('chat.close')}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{t('chat.scope.label')}</p>
        <div className="flex border border-gray-300 rounded overflow-hidden text-xs">
          {CHAT_SCOPES.map((scope, i) => (
            <button
              key={scope}
              onClick={() => setChatScope(scope)}
              disabled={scopeDisabled[scope]}
              className={`flex-1 px-2 py-1 ${i > 0 ? 'border-l border-gray-300' : ''} ${
                effectiveScope === scope
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-white'
              }`}
            >
              {t(`chat.scope.${scope}`)} ({scopeCounts[scope]})
            </button>
          ))}
        </div>
        {scopeCounts[effectiveScope] > MAX_CHAT_DOCUMENTS && (
          <p className="text-[11px] text-gray-400 mt-1">{t('chat.scope.limit_note')}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0 flex flex-col md:flex-row items-start gap-4 md:overflow-x-auto pb-2">
        <div
          className={`bg-white rounded-lg border border-gray-200 w-full ${
            isCollapsed ? 'p-2 md:w-auto md:flex-shrink-0' : selectedDoc ? 'p-6 md:w-[380px] md:flex-shrink-0' : 'p-6'
          }`}
        >
          <div
            className={
              isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between gap-2 mb-4'
            }
          >
            {isCollapsed ? (
              // Slim rail: an icon with the count stands in for the heading.
              <div
                title={t('documents.heading')}
                className="order-2 flex flex-col items-center text-gray-600 py-1 border-y border-gray-100 w-full"
              >
                <span className="text-lg leading-none">📚</span>
                <span className="text-[10px] mt-1">{documents.length}</span>
              </div>
            ) : (
              <h2
                title={t('documents.heading')}
                className={`font-bold text-gray-800 truncate min-w-0 ${selectedDoc ? 'text-lg' : 'text-2xl'}`}
              >
                {t('documents.heading')}
              </h2>
            )}
            <div className={isCollapsed ? 'contents' : 'flex items-center gap-2 flex-shrink-0'}>
              <div className={`${isCollapsed ? 'hidden' : 'flex'} border border-gray-300 rounded overflow-hidden`}>
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
                onClick={() => setChatOpen(o => !o)}
                title={chatOpen ? t('chat.close') : t('chat.open')}
                className={`order-3 px-2 py-1 rounded text-xs ${
                  chatOpen ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                💬
              </button>
              <button
                onClick={loadDocuments}
                title="Refresh documents"
                className="order-4 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs"
              >
                🔄
              </button>
              {selectedDoc && (
                <button
                  onClick={() => setListCollapsed(c => !c)}
                  title={isCollapsed ? t('documents.list.expand') : t('documents.list.collapse')}
                  className="order-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs"
                >
                  {isCollapsed ? '▶' : '◀'}
                </button>
              )}
            </div>
          </div>

          {!isCollapsed && (
            <>
              {documents.length > 0 && (
                <>
                  <div className="relative mb-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('documents.search.placeholder')}
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {hasQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        title={t('documents.search.clear')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-gray-400 hover:text-gray-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-gray-600">
                    <span>
                      {hasQuery
                        ? t('documents.search.count')
                            .replace('{count}', String(filteredDocuments.length))
                            .replace('{total}', String(documents.length))
                        : t('documents.count').replace('{total}', String(documents.length))}
                    </span>
                    <div className="flex items-center gap-3">
                      {selectedIds.size > 0 && (
                        <span className="font-medium text-blue-700">
                          {t('documents.selected_count').replace('{count}', String(selectedIds.size))}
                        </span>
                      )}
                      {filteredIds.length > 0 && !allFilteredSelected && (
                        <button
                          onClick={() => setSelected(filteredIds, true)}
                          className="text-blue-600 hover:underline"
                        >
                          {hasQuery ? t('documents.select.results') : t('documents.select.all')}
                        </button>
                      )}
                      {selectedIds.size > 0 && (
                        <button onClick={() => setSelectedIds(new Set())} className="text-blue-600 hover:underline">
                          {t('documents.select.clear')}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {loading ? (
                <p className="text-center text-gray-500 py-8">{t('documents.loading')}</p>
              ) : documents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('documents.empty')}</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('documents.search.no_results')}</p>
              ) : (
                <>
                  {viewMode === 'thumbnail' ? (
                    <div
                      className={`grid gap-4 ${
                        selectedDoc ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      }`}
                    >
                      {paginatedDocuments.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onDelete={handleDelete}
                          onClick={setSelectedDoc}
                          selected={selectedIds.has(doc.id)}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                    </div>
                  ) : (
                    <DocumentListView
                      documents={paginatedDocuments}
                      onDelete={handleDelete}
                      onClick={setSelectedDoc}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onSelectAll={selected =>
                        setSelected(
                          paginatedDocuments.map(d => d.id),
                          selected,
                        )
                      }
                    />
                  )}
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

                  <button
                    onClick={handleExportAll}
                    disabled={exporting === 'all'}
                    className="mt-4 w-full px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-sm"
                  >
                    {exporting === 'all' ? '⏳ Exporting...' : '📤 Export All to Alfresco'}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {selectedDoc && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 w-full md:flex-1 md:min-w-[320px] lg:sticky lg:top-6 self-start">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800">{selectedDoc.filename}</h3>
                {selectedDoc.alfrescoNodeId && (
                  <p className="text-sm text-green-600 mt-1">
                    ✅ Exported to Alfresco
                    {selectedDoc.alfrescoExportedAt &&
                      ` on ${new Date(selectedDoc.alfrescoExportedAt).toLocaleString()}`}
                  </p>
                )}
              </div>
              <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                ×
              </button>
            </div>

            <div
              className={
                isCollapsed ? 'space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 md:items-start' : 'space-y-4'
              }
            >
              <div className="space-y-2">
                {selectedDoc.fileType === 'image' && (
                  <img
                    src={api.getDocumentFileUrl(selectedDoc.id)}
                    alt={selectedDoc.filename}
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50"
                  />
                )}

                {selectedDoc.fileType === 'pdf' && (
                  <embed
                    src={api.getDocumentFileUrl(selectedDoc.id)}
                    type="application/pdf"
                    className="w-full h-96 rounded-lg border border-gray-200"
                  />
                )}

                {(selectedDoc.fileType === 'image' ||
                  selectedDoc.fileType === 'pdf' ||
                  selectedDoc.fileType === 'text') && (
                  <a
                    href={api.getDocumentFileUrl(selectedDoc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {t('documents.preview.open')}
                  </a>
                )}
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

                {selectedDoc.evaluations && selectedDoc.evaluations.length > 0 && (
                  <EvaluationResults evaluations={selectedDoc.evaluations} />
                )}

                <OcrTextViewer text={selectedDoc.extractedText} ocrUsed={selectedDoc.ocrUsed} />

                {exportStatus[selectedDoc.id] && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">{exportStatus[selectedDoc.id]}</div>
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
          </div>
        )}
      </div>

      {/* Chat: kept mounted while hidden so the conversation survives closing it */}
      {chatOpen && <div className="fixed inset-0 bg-black/30 z-20 xl:hidden" onClick={() => setChatOpen(false)} />}
      <aside
        className={`${chatOpen ? '' : 'hidden'} fixed inset-y-0 right-0 z-30 w-full sm:w-[400px] p-2 bg-gray-50 xl:p-0 xl:bg-transparent xl:z-auto xl:sticky xl:top-16 xl:w-[360px] xl:h-[calc(100vh-5rem)] xl:flex-shrink-0`}
      >
        <ChatPanel
          disabled={documents.length === 0}
          documentIds={chatDocumentIds}
          scopeLabel={chatScopeLabel}
          header={chatHeader}
          onSourceClick={handleSourceClick}
        />
      </aside>
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          title={t('chat.open')}
          className="fixed bottom-6 right-6 z-20 xl:hidden w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-2xl shadow-lg"
        >
          💬
        </button>
      )}
    </div>
  );
};
