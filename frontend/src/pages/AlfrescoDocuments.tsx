import React, { useState, useEffect, useRef } from 'react';
import { api, AlfrescoStatus } from '../api/client';
import { ChatPanel } from '../components/ChatPanel';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentListView } from '../components/DocumentListView';
import { Pagination } from '../components/Pagination';
import { useLanguage } from '../contexts/LanguageContext';
import type { AlfrescoDocument } from '../types';

// Read-only counterpart of the Documents page for the Alfresco site configured
// in .env. Search and paging run in Alfresco, so only one page is loaded at a time.

type ViewMode = 'thumbnail' | 'list';
type ChatScope = 'selected' | 'results' | 'all';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
// Matches MAX_DOCUMENTS_FOR_CHAT in backend/src/routes/llm.ts
const MAX_CHAT_DOCUMENTS = 5;
const CHAT_SCOPES: ChatScope[] = ['selected', 'results', 'all'];

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
  const [refreshCount, setRefreshCount] = useState(0);
  const [listCollapsed, setListCollapsed] = useState(false);
  const isCollapsed = listCollapsed && !!selectedDoc;
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
      .searchAlfrescoDocuments(activeQuery, currentPage, PAGE_SIZE)
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
  }, [ready, activeQuery, currentPage, refreshCount]);

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

  const setSelected = (ids: string[], selected: boolean) => {
    const next = new Set(selectedIds);
    for (const id of ids) {
      if (selected) next.add(id);
      else next.delete(id);
    }
    updateSelection(next);
  };

  const handleSourceClick = async (documentId: string) => {
    // Sources can be on another page of results, so fetch them when needed.
    let doc: AlfrescoDocument | undefined = documents.find(d => d.id === documentId);
    if (!doc) {
      try {
        doc = await api.getAlfrescoDocument(documentId);
      } catch (error) {
        console.error('Failed to load Alfresco document:', error);
        return;
      }
    }
    setSelectedDoc(doc);
    // The drawer covers the page on smaller screens, so get it out of the way.
    if (!isWideScreen()) setChatOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasQuery = activeQuery.length > 0;
  const pageIds = documents.map(d => d.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const libraryTotal = allTotal ?? totalItems;

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
    results: totalItems,
    all: libraryTotal,
  };
  const scopeDisabled: Record<ChatScope, boolean> = {
    selected: selectedIds.size === 0,
    results: !hasQuery,
    all: false,
  };
  const chatScopeLabel = t(`chat.scope.used.${effectiveScope}`).replace('{count}', String(scopeCounts[effectiveScope]));

  const sendChatMessage = (query: string, lang: string) =>
    api.chatAlfresco(
      query,
      lang,
      effectiveScope === 'selected'
        ? { nodeIds: [...selectedIds] }
        : effectiveScope === 'results'
          ? { searchQuery: activeQuery }
          : {},
    );

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

  if (!status) {
    return <p className="text-center text-gray-500 py-8">{t('alfresco.checking')}</p>;
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
                  className={`font-bold text-gray-800 truncate ${selectedDoc ? 'text-lg' : 'text-2xl'}`}
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
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('alfresco.search.placeholder')}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-gray-600">
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
                <p className="text-center text-gray-500 py-8">{t('alfresco.loading')}</p>
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
                <p className="text-center text-gray-500 py-8">
                  {hasQuery ? t('documents.search.no_results') : t('alfresco.empty')}
                </p>
              ) : (
                <>
                  {viewMode === 'thumbnail' ? (
                    <div
                      className={`grid gap-4 ${
                        selectedDoc ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      }`}
                    >
                      {documents.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onClick={d => setSelectedDoc(d as AlfrescoDocument)}
                          selected={selectedIds.has(doc.id)}
                          onToggleSelect={toggleSelect}
                          summary={getSummary(doc)}
                        />
                      ))}
                    </div>
                  ) : (
                    <DocumentListView
                      documents={documents}
                      onClick={d => setSelectedDoc(d as AlfrescoDocument)}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onSelectAll={selected => setSelected(pageIds, selected)}
                      showStatus={false}
                      getSummary={d => getSummary(d as AlfrescoDocument)}
                    />
                  )}
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </>
              )}
            </>
          )}
        </div>

        {selectedDoc && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 w-full md:flex-1 md:min-w-[320px] lg:sticky lg:top-6 self-start">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-800 break-words">{selectedDoc.filename}</h3>
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
                isCollapsed ? 'space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 md:items-start' : 'space-y-4'
              }
            >
              <div className="space-y-2">
                {selectedDoc.fileType === 'image' && (
                  <img
                    src={api.getAlfrescoDocumentContentUrl(selectedDoc.id)}
                    alt={selectedDoc.filename}
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50"
                  />
                )}

                {selectedDoc.fileType === 'pdf' && (
                  <embed
                    src={api.getAlfrescoDocumentContentUrl(selectedDoc.id)}
                    type="application/pdf"
                    className="w-full h-96 rounded-lg border border-gray-200"
                  />
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

              <div className="space-y-4">
                <div className="space-y-0.5">
                  <p className="text-sm text-gray-600">
                    <strong>{t('alfresco.detail.created')}</strong> {new Date(selectedDoc.uploadedAt).toLocaleString()}
                    {selectedDoc.alfresco.createdBy && ` (${selectedDoc.alfresco.createdBy})`}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>{t('alfresco.detail.modified')}</strong>{' '}
                    {new Date(selectedDoc.alfresco.modifiedAt).toLocaleString()}
                    {selectedDoc.alfresco.modifiedBy && ` (${selectedDoc.alfresco.modifiedBy})`}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>{t('alfresco.detail.type')}</strong>{' '}
                    {selectedDoc.alfresco.mimeType || selectedDoc.fileType.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>{t('alfresco.detail.size')}</strong> {formatSize(selectedDoc.alfresco.sizeInBytes)}
                  </p>
                  {selectedDoc.alfresco.name !== selectedDoc.filename && (
                    <p className="text-sm text-gray-600 break-all">
                      <strong>{t('alfresco.detail.name')}</strong> {selectedDoc.alfresco.name}
                    </p>
                  )}
                  {selectedDoc.originalPrompt && (
                    <p className="text-sm text-gray-600">
                      <strong>{t('alfresco.detail.prompt')}</strong> {selectedDoc.originalPrompt}
                    </p>
                  )}
                </div>

                {selectedDoc.alfresco.description && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('alfresco.detail.description')}</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                      {selectedDoc.alfresco.description}
                    </p>
                  </div>
                )}

                {selectedDoc.alfresco.snippet && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('alfresco.detail.snippet')}</h4>
                    <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                      …{selectedDoc.alfresco.snippet}…
                    </p>
                  </div>
                )}

                {Object.keys(selectedDoc.extractedData).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('document.data')}</h4>
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
                )}

                {selectedDoc.keywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('alfresco.detail.keywords')}</h4>
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
                )}

                {!selectedDoc.alfresco.exportedByApp && (
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
                    ℹ️ {t('alfresco.detail.metadata_only')}
                  </p>
                )}
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
