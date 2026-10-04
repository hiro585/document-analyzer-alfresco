import React, { useState, useEffect, useRef } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { ChatPanel } from '../components/ChatPanel';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentListView } from '../components/DocumentListView';
import { Pagination, usePageSize, pageAfterResize } from '../components/Pagination';
import { RelatedDocuments } from '../components/RelatedDocuments';
import { EvaluationResults } from '../components/EvaluationResults';
import { OcrTextViewer } from '../components/OcrTextViewer';
import { useLanguage } from '../contexts/LanguageContext';
import type { Document } from '../types';
import { useRelatedDocuments } from '../hooks/useRelatedDocuments';
import { DetailTabs } from '../components/DetailTabs';
import { ExtractedDataList } from '../components/ExtractedDataList';
import { CompareButton, CompareView } from '../components/CompareView';

interface DocumentsPageProps {
  refreshTrigger?: number;
}

type ViewMode = 'thumbnail' | 'list';

// With the list collapsed the preview sits beside the details, so it can use
// the panel's full height (the panel is capped at 100vh - 72px; its padding,
// title and the "open original" link take the rest). Never below the normal 24rem.
const PREVIEW_HEIGHT_COLLAPSED = {
  image: 'max-h-[max(24rem,calc(100vh-180px))]',
  pdf: 'h-[max(24rem,calc(100vh-180px))]',
};
type ChatScope = 'document' | 'selected' | 'results' | 'all';

// Matches MAX_DOCUMENTS_FOR_CHAT in backend/src/routes/llm.ts
const MAX_CHAT_DOCUMENTS = 5;
const CHAT_SCOPES: ChatScope[] = ['document', 'selected', 'results', 'all'];

// At Tailwind's xl breakpoint the chat is a side column; below it, a slide-over drawer.
const isWideScreen = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

export const Documents: React.FC<DocumentsPageProps> = ({ refreshTrigger }) => {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('documentsPageSize');
  const handlePageSizeChange = (size: number) => {
    setCurrentPage(pageAfterResize(currentPage, pageSize, size));
    setPageSize(size);
  };
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<Record<string, string>>({});
  const [listCollapsed, setListCollapsed] = useState(false);
  // Two ticked documents shown side by side, in place of the details panel
  const [comparing, setComparing] = useState<[Document, Document] | null>(null);
  const hasSidePanel = !!selectedDoc || !!comparing;
  const isCollapsed = listCollapsed && hasSidePanel;
  const detailsRef = useRef<HTMLDivElement>(null);

  // Opening a single document ends a comparison.
  const showDocument = (doc: Document) => {
    setComparing(null);
    setSelectedDoc(doc);
  };

  const handleRelatedClick = async (documentId: string) => {
    let doc = documents.find(d => d.id === documentId);
    if (!doc) {
      try {
        doc = await api.getDocument(documentId);
      } catch (error) {
        console.error('Failed to load document:', error);
        return;
      }
    }
    showDocument(doc);
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const { related, loading: relatedLoading } = useRelatedDocuments(selectedDoc?.id, api.getRelatedDocuments);

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

  const startCompare = () => {
    // In the order they were ticked, so the first pick is on the left
    const docs = [...selectedIds].flatMap(id => documents.filter(d => d.id === id));
    if (docs.length !== 2) return;
    setComparing([docs[0], docs[1]]);
    setListCollapsed(true);
  };

  const closeCompare = () => {
    setComparing(null);
    setListCollapsed(false);
  };

  // Unticking (or deleting) a compared document ends the comparison.
  useEffect(() => {
    if (comparing && !comparing.every(doc => selectedIds.has(doc.id))) closeCompare();
  }, [selectedIds]);

  const handleSourceClick = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;
    showDocument(doc);
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
      if (selectedDoc?.id === docId) closeDetails();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleExportToAlfresco = async (docId: string) => {
    setExporting(docId);
    try {
      const result = await api.exportDocumentToAlfresco(docId);
      if (result.success) {
        // Success shows as the "Exported to Alfresco" line under the filename;
        // the status message is only for failures, so clear any earlier one.
        setExportStatus(prev => {
          const { [docId]: _previous, ...rest } = prev;
          return rest;
        });
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
          [docId]: `❌ ${t('upload.export.failed')} ${result.error}`,
        }));
      }
    } catch (error) {
      setExportStatus(prev => ({
        ...prev,
        [docId]: `❌ ${t('upload.export.failed')} ${apiErrorMessage(error) ?? t('error.server_unreachable')}`,
      }));
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    if (!confirm(t('documents.export_all.confirm').replace('{count}', String(documents.length)))) return;
    setExporting('all');
    try {
      const result = await api.exportAllToAlfresco();
      if (result.success) {
        alert(t('documents.export_all.done').replace('{count}', String(result.exported)));
        if (result.failed > 0) {
          alert(t('documents.export_all.some_failed').replace('{count}', String(result.failed)));
        }
        // Refresh documents list
        loadDocuments();
      }
    } catch (error) {
      alert(`❌ ${t('upload.export.failed')} ${apiErrorMessage(error) ?? t('error.server_unreachable')}`);
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

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasQuery = searchQuery.trim().length > 0;
  const filteredIds = filteredDocuments.map(d => d.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  // The document open in the details panel (none while comparing)
  const openDoc = comparing ? null : selectedDoc;

  // Opening a document points the chat at it; ticking documents or picking
  // another scope moves it elsewhere (the latest action wins).
  const openDocId = openDoc?.id;
  useEffect(() => {
    if (openDocId) setChatScope('document');
  }, [openDocId]);

  // Fall back when the chosen scope has nothing in it (no open document / selection / search).
  const effectiveScope: ChatScope =
    chatScope === 'document' && !openDoc
      ? selectedIds.size > 0
        ? 'selected'
        : hasQuery
          ? 'results'
          : 'all'
      : chatScope === 'selected' && selectedIds.size === 0
        ? hasQuery
          ? 'results'
          : 'all'
        : chatScope === 'results' && !hasQuery
          ? 'all'
          : chatScope;

  const scopeCounts: Record<ChatScope, number> = {
    document: openDoc ? 1 : 0,
    selected: selectedIds.size,
    results: filteredDocuments.length,
    all: documents.length,
  };
  const scopeDisabled: Record<ChatScope, boolean> = {
    document: !openDoc,
    selected: selectedIds.size === 0,
    results: !hasQuery,
    all: false,
  };
  const chatDocumentIds =
    effectiveScope === 'document' && openDoc
      ? [openDoc.id]
      : effectiveScope === 'selected'
        ? documents.filter(d => selectedIds.has(d.id)).map(d => d.id)
        : effectiveScope === 'results'
          ? filteredIds
          : undefined;
  const chatScopeLabel = t(`chat.scope.used.${effectiveScope}`)
    .replace('{count}', String(scopeCounts[effectiveScope]))
    .replace('{name}', openDoc?.filename ?? '');

  // Info tab content, shared by the details panel and the comparison view
  const renderInfo = (doc: Document) => (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm text-gray-600">
          <strong>{t('document.uploaded')}</strong> {new Date(doc.uploadedAt).toLocaleString()}
        </p>
        <p className="text-sm text-gray-600">
          <strong>{t('alfresco.detail.type')}</strong> {doc.fileType.toUpperCase()}
        </p>
        <p className="text-sm text-gray-600">
          <strong>{t('alfresco.detail.prompt')}</strong> {doc.originalPrompt}
        </p>
      </div>
      {doc.keywords.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">{t('alfresco.detail.keywords')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {doc.keywords.map((kw: string, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Explains what each scope's button really sends to the AI
  const scopeTitle = (scope: ChatScope): string | undefined =>
    scope === 'document'
      ? openDoc?.filename
      : scope === 'all'
        ? t('chat.scope.all.hint').replace('{total}', String(scopeCounts.all))
        : scopeCounts[scope] > MAX_CHAT_DOCUMENTS
          ? t('chat.scope.limit_hint').replace('{count}', String(scopeCounts[scope]))
          : undefined;

  const chatHeader = (
    <div className="border-b border-gray-200 p-2 space-y-1.5">
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
              title={scopeTitle(scope)}
              className={`flex-1 px-1.5 py-1 leading-tight ${i > 0 ? 'border-l border-gray-300' : ''} ${
                effectiveScope === scope
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-white'
              }`}
            >
              {t(`chat.scope.${scope}`)}
              {(scope === 'selected' || scope === 'results') && ` (${scopeCounts[scope]})`}
            </button>
          ))}
        </div>
        {scopeCounts[effectiveScope] > MAX_CHAT_DOCUMENTS && (
          <p className="text-[11px] text-gray-600 mt-1">ℹ️ {t('chat.scope.limit_note')}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0 flex flex-col md:flex-row items-start gap-3 md:overflow-x-auto pb-1">
        <div
          className={`bg-white rounded-lg border border-gray-200 w-full ${
            isCollapsed ? 'p-2 md:w-auto md:flex-shrink-0' : hasSidePanel ? 'p-3 md:w-[360px] md:flex-shrink-0' : 'p-3'
          }`}
        >
          <div
            className={
              isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between gap-2 mb-2'
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
                className={`font-bold text-gray-800 truncate min-w-0 ${hasSidePanel ? 'text-base' : 'text-xl'}`}
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
                title={t('alfresco.refresh')}
                className="order-4 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs"
              >
                🔄
              </button>
              {hasSidePanel && (
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
                      className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-gray-600">
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
                      {selectedIds.size > 0 && (
                        <CompareButton selectedCount={selectedIds.size} onClick={startCompare} />
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
                <p className="text-center text-gray-500 py-6">{t('documents.loading')}</p>
              ) : documents.length === 0 ? (
                <p className="text-center text-gray-500 py-6">{t('documents.empty')}</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="text-center text-gray-500 py-6">{t('documents.search.no_results')}</p>
              ) : (
                <>
                  {viewMode === 'thumbnail' ? (
                    <div
                      className={`grid gap-3 ${
                        hasSidePanel ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                      }`}
                    >
                      {paginatedDocuments.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onDelete={handleDelete}
                          onClick={showDocument}
                          selected={selectedIds.has(doc.id)}
                          onToggleSelect={toggleSelect}
                          thumbnailUrl={doc.fileType !== 'text' ? api.getDocumentThumbnailUrl(doc.id) : undefined}
                        />
                      ))}
                    </div>
                  ) : (
                    <DocumentListView
                      documents={paginatedDocuments}
                      onDelete={handleDelete}
                      onClick={showDocument}
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
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    totalItems={filteredDocuments.length}
                    onPageSizeChange={handlePageSizeChange}
                  />

                  <button
                    onClick={handleExportAll}
                    disabled={exporting === 'all'}
                    className="mt-4 w-full px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-sm"
                  >
                    {exporting === 'all' ? t('upload.export.loading') : t('documents.export_all.button')}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {comparing && (
          <CompareView
            documents={comparing}
            getFileUrl={api.getDocumentFileUrl}
            renderInfo={renderInfo}
            onClose={closeCompare}
          />
        )}

        {!comparing && selectedDoc && (
          <div
            ref={detailsRef}
            className="bg-white p-4 rounded-lg border border-gray-200 w-full md:flex-1 md:min-w-[320px] lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto self-start scroll-mt-16"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 break-words">{selectedDoc.filename}</h3>
                {selectedDoc.alfrescoNodeId && (
                  <p
                    className="text-sm text-green-600 mt-1"
                    title={`${t('upload.export.node_id')} ${selectedDoc.alfrescoNodeId}`}
                  >
                    {selectedDoc.alfrescoExportedAt
                      ? t('documents.exported_on').replace(
                          '{date}',
                          new Date(selectedDoc.alfrescoExportedAt).toLocaleString(),
                        )
                      : t('upload.export.success')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!selectedDoc.alfrescoNodeId && (
                  <button
                    onClick={() => handleExportToAlfresco(selectedDoc.id)}
                    disabled={exporting === selectedDoc.id}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-xs whitespace-nowrap"
                  >
                    {exporting === selectedDoc.id ? t('upload.export.loading') : t('upload.export.alfresco')}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  title={t('documents.delete')}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                >
                  🗑️
                </button>
                <button onClick={closeDetails} className="ml-1 text-gray-500 hover:text-gray-700 text-2xl leading-none">
                  ×
                </button>
              </div>
            </div>

            {exportStatus[selectedDoc.id] && (
              <div className="mb-3 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">{exportStatus[selectedDoc.id]}</div>
            )}

            <div
              className={
                isCollapsed ? 'space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start' : 'space-y-3'
              }
            >
              <div className="space-y-2">
                {selectedDoc.fileType === 'image' && (
                  <img
                    src={api.getDocumentFileUrl(selectedDoc.id)}
                    alt={selectedDoc.filename}
                    onClick={() => setListCollapsed(true)}
                    title={isCollapsed ? undefined : t('documents.preview.expand')}
                    className={`w-full object-contain rounded-lg border border-gray-200 bg-gray-50 ${
                      isCollapsed ? PREVIEW_HEIGHT_COLLAPSED.image : 'max-h-96 cursor-zoom-in'
                    }`}
                  />
                )}

                {selectedDoc.fileType === 'pdf' && (
                  <div className="relative">
                    <iframe
                      title={selectedDoc.filename}
                      src={api.getDocumentFileUrl(selectedDoc.id)}
                      className={`block w-full rounded-lg border border-gray-200 ${isCollapsed ? PREVIEW_HEIGHT_COLLAPSED.pdf : 'h-96'}`}
                    />
                    {/* Clicks inside the PDF viewer never reach the page, so while the list is
                        open a transparent layer catches the "enlarge" click. It goes away once
                        the list is collapsed, so the viewer can be scrolled and zoomed. */}
                    {!isCollapsed && (
                      <div
                        onClick={() => setListCollapsed(true)}
                        title={t('documents.preview.expand')}
                        className="absolute inset-0 cursor-zoom-in"
                      />
                    )}
                  </div>
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

              <DetailTabs
                tabs={[
                  {
                    id: 'info',
                    label: t('documents.tab.info'),
                    content: renderInfo(selectedDoc),
                  },
                  {
                    id: 'data',
                    label: t('documents.tab.data'),
                    count: Object.keys(selectedDoc.extractedData).length,
                    disabled: Object.keys(selectedDoc.extractedData).length === 0,
                    content: <ExtractedDataList data={selectedDoc.extractedData} />,
                  },
                  {
                    id: 'related',
                    label: t('documents.tab.related'),
                    count: related.length,
                    loading: relatedLoading,
                    disabled: !relatedLoading && related.length === 0,
                    content: (
                      <RelatedDocuments related={related} loading={relatedLoading} onSelect={handleRelatedClick} />
                    ),
                  },
                  {
                    id: 'agents',
                    label: t('documents.tab.agents'),
                    count: selectedDoc.evaluations?.length ?? 0,
                    disabled: !selectedDoc.evaluations?.length,
                    content: <EvaluationResults evaluations={selectedDoc.evaluations ?? []} showHeading={false} />,
                  },
                  {
                    id: 'text',
                    label: t('documents.tab.text'),
                    disabled: !selectedDoc.extractedText,
                    content: (
                      <OcrTextViewer text={selectedDoc.extractedText} ocrUsed={selectedDoc.ocrUsed} alwaysExpanded />
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat: kept mounted while hidden so the conversation survives closing it */}
      {chatOpen && <div className="fixed inset-0 bg-black/30 z-20 xl:hidden" onClick={() => setChatOpen(false)} />}
      <aside
        className={`${chatOpen ? '' : 'hidden'} fixed inset-y-0 right-0 z-30 w-full sm:w-[400px] p-2 bg-gray-50 xl:p-0 xl:bg-transparent xl:z-auto xl:sticky xl:top-[60px] xl:w-[340px] xl:h-[calc(100vh-72px)] xl:flex-shrink-0`}
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
