import React, { useEffect, useRef, useState } from 'react';
import { api, ChatResponse, ChatSource } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  scopeLabel?: string;
  sources?: ChatSource[];
}

interface ChatPanelProps {
  disabled?: boolean;
  // Limits the chat to these documents; undefined means all documents.
  documentIds?: string[];
  // Short description of the current scope, shown under each question.
  scopeLabel?: string;
  // Rendered above the messages (title, scope selector, ...).
  header?: React.ReactNode;
  // Called when a source is clicked; without it, sources open the original file.
  onSourceClick?: (documentId: string) => void;
  // Overrides how questions are sent (default: local documents chat with documentIds).
  sendMessage?: (query: string, language: string) => Promise<ChatResponse>;
  // Overrides the link to a source's original file (default: local documents).
  getSourceUrl?: (documentId: string) => string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  disabled,
  documentIds,
  scopeLabel,
  header,
  onSourceClick,
  sendMessage,
  getSourceUrl = api.getDocumentFileUrl,
}) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      scopeLabel,
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = sendMessage ? await sendMessage(query, language) : await api.chat(query, language, documentIds);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        sources: response.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: t('chat.error'),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      {header}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8 space-y-2">
            <p>{t('chat.empty')}</p>
            {onSourceClick && <p className="text-xs text-gray-400">{t('chat.empty.hint')}</p>}
          </div>
        )}
        {messages.map(message => (
          <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg ${
                message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            {message.scopeLabel && <p className="text-[11px] text-gray-400 mt-1">{message.scopeLabel}</p>}

            {message.sources && message.sources.length > 0 && (
              <div className="max-w-[85%] w-full mt-2 space-y-1">
                <p className="text-xs font-semibold text-gray-500">{t('chat.sources')}</p>
                {message.sources.map(source =>
                  onSourceClick ? (
                    <div
                      key={source.id}
                      className="flex items-start gap-2 bg-white border border-gray-200 rounded p-2 hover:bg-gray-50"
                    >
                      <button
                        type="button"
                        onClick={() => onSourceClick(source.id)}
                        title={t('chat.source.show')}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-xs font-medium text-blue-600 truncate">📄 {source.filename}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{source.summary}</p>
                      </button>
                      <a
                        href={getSourceUrl(source.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('documents.preview.open')}
                        className="text-xs text-gray-400 hover:text-blue-600"
                      >
                        🔗
                      </a>
                    </div>
                  ) : (
                    <a
                      key={source.id}
                      href={getSourceUrl(source.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-gray-200 rounded p-2 hover:bg-gray-50"
                    >
                      <p className="text-xs font-medium text-blue-600 truncate">🔗 {source.filename}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{source.summary}</p>
                    </a>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
              <p className="text-sm">{t('search.chat_loading')}</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3 flex gap-2">
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            disabled={loading}
            title={t('chat.clear')}
            className="px-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-40"
          >
            ↺
          </button>
        )}
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={disabled || loading}
          placeholder={t('search.chat_placeholder')}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
        />
        <button
          type="submit"
          disabled={disabled || loading || !query.trim()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-400 text-sm whitespace-nowrap"
        >
          {t('search.send')}
        </button>
      </form>
    </div>
  );
};
