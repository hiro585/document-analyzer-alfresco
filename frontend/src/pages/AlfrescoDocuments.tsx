import React, { useState, useEffect, useRef } from 'react';
import { api, AlfrescoStatus } from '../api/client';
import { ChatPanel } from '../components/ChatPanel';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentListView } from '../components/DocumentListView';
import { Pagination, usePageSize, pageAfterResize } from '../components/Pagination';
import { RelatedDocuments } from '../components/RelatedDocuments';
import { useLanguage } from '../contexts/LanguageContext';
import type { AlfrescoDocument } from '../types';
import { useRelatedDocuments } from '../hooks/useRelatedDocuments';
import { DetailTabs } from '../components/DetailTabs';
import { ExtractedDataList } from '../components/ExtractedDataList';
import { CompareButton, CompareView } from '../components/CompareView';

// Read-only counterpart of the Documents page for the Alfresco site configured
// in .env. Search and paging run in Alfresco, so only one page is loaded at a time.

type ViewMode = 'thumbnail' | 'list';

// With the list collapsed the preview sits beside the details, so it can use
// the panel's full height (the panel is capped at 100vh - 72px; its padding,
// title and the "open original" link take the rest). Never below the normal 24rem.
const PREVIEW_HEIGHT_COLLAPSED = {
  image: 'max-h-[max(24rem,calc(100vh-180px))]',
  pdf: 'h-[max(24rem,calc(100vh-180px))]',
};
type ChatScope = 'document' | 'selected' | 'results' | 'all';

const SEARCH_DEBOUNCE_MS = 400;
// Matches MAX_DOCUMENTS_FOR_CHAT in backend/src/routes/llm.ts
const MAX_CHAT_DOCUMENTS = 5;
const CHAT_SCOPES: ChatScope[] = ['document', 'selected', 'results', 'all'];

// At Tailwind's xl breakpoint the chat is a side column; below it, a slide-over drawer.
const isWideScreen = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

const formatSize = (bytes?: number) => {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getSummary = (doc: AlfrescoDocument) => doc.alfresco.snippet || doc.alfresco.description;

export const AlfrescoDocuments: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<AlfrescoStatus | null>(null);
  const [documents, setDocuments] = useState<AlfrescoDocument[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  // Size of the whole library, remembered from the last unfiltered load
  const [allTotal, setAllTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<AlfrescoDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // The query actually sent to Alfresco, updated once typing pauses
  const [activeQuery, setActiveQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('alfrescoDocumentsPageSize');
  const handlePageSizeChange = (size: number) => {
    setCurrentPage(pageAfterResize(currentPage, pageSize, size));
    setPageSize(size);
  };
  const [refreshCount, setRefreshCount] = useState(0);
  const [listCollapsed, setListCollapsed] = useState(false);
  // Two ticked documents shown side by side, in place of the details panel
  const [comparing, setComparing] = useState<[AlfrescoDocument, AlfrescoDocument] | null>(null);
  const hasSidePanel = !!selectedDoc || !!comparing;
  const isCollapsed = listCollapsed && hasSidePanel;

  // Opening a single document ends a comparison.
  const showDocument = (doc: AlfrescoDocument) => {
    setComparing(null);
    setSelectedDoc(doc);
  };
  const requestRef = useRef(0);

  const closeDetails = () => {
    setSelectedDoc(null);
    setListCollapsed(false);
  };
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'thumbnail';
    return (localStorage.getItem('alfrescoDocumentsViewMode') as ViewMode) || 'thumbnail';
  });

  useEffect(() => {
    localStorage.setItem('alfrescoDocumentsViewMode', viewMode);
  }, [viewMode]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 'results' follows the search box: the whole site when it's empty.
  const [chatScope, setChatScope] = useState<ChatScope>('results');
  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    if (!isWideScreen()) return false;
    try {
      return localStorage.getItem('alfrescoDocumentsChatOpen') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!isWideScreen()) return;
    try {
      localStorage.setItem('alfrescoDocumentsChatOpen', String(chatOpen));
    } catch {
      // Storage unavailable; the panel state just won't be remembered.
    }
  }, [chatOpen]);

  const checkStatus = async () => {
    setStatus(null);
    try {
      setStatus(await api.getAlfrescoStatus());
    } catch (error) {
      setStatus({
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setActiveQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeQuery]);

  const ready = !!status?.configured && status.connected;

  useEffect(() => {
    if (!ready) return;
    // Ignore responses that arrive after a newer request was made.
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    api
      .searchAlfrescoDocuments(activeQuery, currentPage, pageSize)
      .then(result => {
        if (requestId !== requestRef.current) return;
        setDocuments(result.documents);
        setTotalItems(result.totalItems);
        if (!activeQuery) setAllTotal(result.totalItems);
      })
      .catch(error => {
        if (requestId !== requestRef.current) return;
        setDocuments([]);
        setTotalItems(0);
        setLoadError(error?.response?.data?.error || (error instanceof Error ? error.message : 'Unknown error'));
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });
  }, [ready, activeQuery, currentPage, pageSize, refreshCount]);

  const refresh = () => setRefreshCount(c => c + 1);

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

  const startCompare = async () => {
    // In the order they were ticked, so the first pick is on the left. Ticked
    // documents can be on other pages of results, so fetch any not loaded.
    const ids = [...selectedIds];
    if (ids.length !== 2) return;
    try {
      const docs = await Promise.all(ids.map(id => documents.find(d => d.id === id) ?? api.getAlfrescoDocument(id)));
      setComparing([docs[0], docs[1]]);
      setListCollapsed(true);
    } catch (error) {
      console.error('Failed to load documents to compare:', error);
    }
  };

  const closeCompare = () => {
    setComparing(null);
    setListCollapsed(false);
  };

  // Unticking a compared document ends the comparison.
  useEffect(() => {
    if (comparing && !comparing.every(doc => selectedIds.has(doc.id))) closeCompare();
  }, [selectedIds]);

  const setSelected = (ids: string[], selected: boolean) => {
    const next = new Set(selectedIds);
    for (const id of ids) {
      if (selected) next.add(id);
      else next.delete(id);
    }
    updateSelection(next);
  };

  // Chat sources and related documents can be on another page of results, so fetch them when needed.
  const openDocument = async (documentId: string): Promise<boolean> => {
    let doc: AlfrescoDocument | undefined = documents.find(d => d.id === documentId);
    if (!doc) {
      try {
        doc = await api.getAlfrescoDocument(documentId);
      } catch (error) {
        console.error('Failed to load Alfresco document:', error);
        return false;
      }
    }
    showDocument(doc);
    return true;
  };

  const handleSourceClick = async (documentId: string) => {
    if (!(await openDocument(documentId))) return;
    // The drawer covers the page on smaller screens, so get it out of the way.
    if (!isWideScreen()) setChatOpen(false);
  };

  const detailsRef = useRef<HTMLDivElement>(null);
  const handleRelatedClick = async (documentId: string) => {
    if (await openDocument(documentId)) {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const { related, loading: relatedLoading } = useRelatedDocuments(selectedDoc?.id, api.getAlfrescoRelatedDocuments);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hasQuery = activeQuery.length > 0;
  const pageIds = documents.map(d => d.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const libraryTotal = allTotal ?? totalItems;

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
    results: totalItems,
    all: libraryTotal,
  };
  const scopeDisabled: Record<ChatScope, boolean> = {
    document: !openDoc,
    selected: selectedIds.size === 0,
    results: !hasQuery,
    all: false,
  };
  const chatScopeLabel = t(`chat.scope.used.${effectiveScope}`)
    .replace('{count}', String(scopeCounts[effectiveScope]))
    .replace('{name}', openDoc?.filename ?? '');

  const sendChatMessage = (query: string, lang: string) =>
    api.chatAlfresco(
      query,
      lang,
      effectiveScope === 'document' && openDoc
        ? { nodeIds: [openDoc.id] }
        : effectiveScope === 'selected'
          ? { nodeIds: [...selectedIds] }
          : effectiveScope === 'results'
            ? { searchQuery: activeQuery }
            : {},
    );

  // Info tab content, shared by the details panel and the comparison view
  const renderInfo = (doc: AlfrescoDocument) => (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm text-gray-600">
          <strong>{t('alfresco.detail.created')}</strong> {new Date(doc.uploadedAt).toLocaleString()}
          {doc.alfresco.createdBy && ` (${doc.alfresco.createdBy})`}
        </p>
        <p className="text-sm text-gray-600">
          <strong>{t('alfresco.detail.modified')}</strong> {new Date(doc.alfresco.modifiedAt).toLocaleString()}
          {doc.alfresco.modifiedBy && ` (${doc.alfresco.modifiedBy})`}
        </p>
        <p className="text-sm text-gray-600">
          <strong>{t('alfresco.detail.type')}</strong> {doc.alfresco.mimeType || doc.fileType.toUpperCase()}
        </p>
        <p className="text-sm text-gray-600">
          <strong>{t('alfresco.detail.size')}</strong> {formatSize(doc.alfresco.sizeInBytes)}
        </p>
        {doc.alfresco.name !== doc.filename && (
          <p className="text-sm text-gray-600 break-all">
            <strong>{t('alfresco.detail.name')}</strong> {doc.alfresco.name}
          </p>
        )}
        {doc.originalPrompt && (
          <p className="text-sm text-gray-600">
            <strong>{t('alfresco.detail.prompt')}</strong> {doc.originalPrompt}
          </p>
        )}
      </div>

      {doc.alfresco.description && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">{t('alfresco.detail.description')}</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded-lg">
            {doc.alfresco.description}
          </p>
        </div>
      )}

      {doc.alfresco.snippet && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">{t('alfresco.detail.snippet')}</h4>
          <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded-lg">…{doc.alfresco.snippet}…</p>
        </div>
      )}

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

      {!doc.alfresco.exportedByApp && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
          ℹ️ {t('alfresco.detail.metadata_only')}
        </p>
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

  if (!status) {
    return <p className="text-center text-gray-500 py-6">{t('alfresco.checking')}</p>;
  }

  if (!status.configured || !status.connected) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 max-w-2xl mx-auto text-center space-y-3">
        <p className="text-4xl">{status.configured ? '⚠️' : '🗄️'}</p>
        <h2 className="text-xl font-bold text-gray-800">
          {status.configured ? t('alfresco.unreachable.title') : t('alfresco.not_configured.title')}
        </h2>
        <p className="text-sm text-gray-600">
          {status.configured ? t('alfresco.unreachable.body') : t('alfresco.not_configured.body')}
        </p>
        {!status.configured && (
          <pre className="text-left text-xs bg-gray-50 border border-gray-200 rounded p-3 inline-block">
            {`ALFRESCO_URL=http://<host>:8080/alfresco/api/-default-/public/alfresco/versions/1
ALFRESCO_USERNAME=<user>
ALFRESCO_PASSWORD=<password>
ALFRESCO_SITE=demo`}
          </pre>
        )}
        {status.configured && status.error && <p className="text-xs text-gray-400">{status.error}</p>}
        {status.configured && (
          <button onClick={checkStatus} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">
            {t('alfresco.retry')}
          </button>
        )}
      </div>
    );
  }

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
                title={t('alfresco.heading')}
                className="order-2 flex flex-col items-center text-gray-600 py-1 border-y border-gray-100 w-full"
              >
                <span className="text-lg leading-none">🗄️</span>
                <span className="text-[10px] mt-1">{totalItems}</span>
              </div>
            ) : (
              <div className="min-w-0">
                <h2
                  title={t('alfresco.heading')}
                  className={`font-bold text-gray-800 truncate ${hasSidePanel ? 'text-base' : 'text-xl'}`}
                >
                  {t('alfresco.heading')}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  {t('alfresco.site').replace('{site}', status.site || '')}
                </p>
              </div>
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
                onClick={refresh}
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
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('alfresco.search.placeholder')}
                  className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
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
                        .replace('{count}', String(totalItems))
                        .replace('{total}', String(libraryTotal))
                    : t('documents.count').replace('{total}', String(totalItems))}
                </span>
                <div className="flex items-center gap-3">
                  {selectedIds.size > 0 && (
                    <span className="font-medium text-blue-700">
                      {t('documents.selected_count').replace('{count}', String(selectedIds.size))}
                    </span>
                  )}
                  {selectedIds.size > 0 && <CompareButton selectedCount={selectedIds.size} onClick={startCompare} />}
                  {pageIds.length > 0 && !allPageSelected && (
                    <button onClick={() => setSelected(pageIds, true)} className="text-blue-600 hover:underline">
                      {t('documents.select.page')}
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button onClick={() => setSelectedIds(new Set())} className="text-blue-600 hover:underline">
                      {t('documents.select.clear')}
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <p className="text-center text-gray-500 py-6">{t('alfresco.loading')}</p>
              ) : loadError ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-red-600 text-sm">
                    {t('alfresco.error.load')} {loadError}
                  </p>
                  <button onClick={refresh} className="text-blue-600 hover:underline text-sm">
                    {t('alfresco.retry')}
                  </button>
                </div>
              ) : documents.length === 0 ? (
                <p className="text-center text-gray-500 py-6">
                  {hasQuery ? t('documents.search.no_results') : t('alfresco.empty')}
                </p>
              ) : (
                <>
                  {viewMode === 'thumbnail' ? (
                    <div
                      className={`grid gap-3 ${
                        hasSidePanel ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                      }`}
                    >
                      {documents.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onClick={d => showDocument(d as AlfrescoDocument)}
                          selected={selectedIds.has(doc.id)}
                          onToggleSelect={toggleSelect}
                          summary={getSummary(doc)}
                          thumbnailUrl={api.getAlfrescoDocumentThumbnailUrl(doc.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <DocumentListView
                      documents={documents}
                      onClick={d => showDocument(d as AlfrescoDocument)}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onSelectAll={selected => setSelected(pageIds, selected)}
                      showStatus={false}
                      getSummary={d => getSummary(d as AlfrescoDocument)}
                    />
                  )}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </>
              )}
            </>
          )}
        </div>

        {comparing && (
          <CompareView
            documents={comparing}
            getFileUrl={api.getAlfrescoDocumentContentUrl}
            renderInfo={renderInfo}
            onClose={closeCompare}
          />
        )}

        {!comparing && selectedDoc && (
          <div
            ref={detailsRef}
            className="bg-white p-4 rounded-lg border border-gray-200 w-full md:flex-1 md:min-w-[320px] lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto self-start scroll-mt-16"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 break-words">{selectedDoc.filename}</h3>
                {selectedDoc.alfresco.path && (
                  <p className="text-xs text-gray-500 mt-1 break-all">📁 {selectedDoc.alfresco.path}</p>
                )}
                {selectedDoc.alfresco.exportedByApp && (
                  <p className="text-sm text-green-600 mt-1">✅ {t('alfresco.exported_badge')}</p>
                )}
              </div>
              <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                ×
              </button>
            </div>

            <div
              className={
                isCollapsed ? 'space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start' : 'space-y-3'
              }
            >
              <div className="space-y-2">
                {selectedDoc.fileType === 'image' && (
                  <img
                    src={api.getAlfrescoDocumentContentUrl(selectedDoc.id)}
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
                      src={api.getAlfrescoDocumentContentUrl(selectedDoc.id)}
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

                <div className="flex flex-wrap gap-4">
                  <a
                    href={api.getAlfrescoDocumentContentUrl(selectedDoc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {t('documents.preview.open')}
                  </a>
                  {selectedDoc.alfresco.shareUrl && (
                    <a
                      href={selectedDoc.alfresco.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {t('alfresco.open_in_alfresco')}
                    </a>
                  )}
                </div>
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
          disabled={libraryTotal === 0}
          scopeLabel={chatScopeLabel}
          header={chatHeader}
          onSourceClick={handleSourceClick}
          sendMessage={sendChatMessage}
          getSourceUrl={api.getAlfrescoDocumentContentUrl}
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
