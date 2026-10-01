import React, { useState } from 'react';
import { api, ChatSource } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

interface ChatPanelProps {
  disabled?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ disabled }) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await api.chat(query, language);
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
        content: 'Sorry, I encountered an error. Make sure Ollama is running.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-gray-500 text-sm py-8">{t('chat.empty')}</p>}
        {messages.map(message => (
          <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            </div>

            {message.sources && message.sources.length > 0 && (
              <div className="max-w-xs w-full mt-2 space-y-1">
                <p className="text-xs font-semibold text-gray-500">{t('chat.sources')}</p>
                {message.sources.map(source => (
                  <a
                    key={source.id}
                    href={api.getDocumentFileUrl(source.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border border-gray-200 rounded p-2 hover:bg-gray-50"
                  >
                    <p className="text-xs font-medium text-blue-600 truncate">🔗 {source.filename}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{source.summary}</p>
                  </a>
                ))}
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
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={disabled || loading}
          placeholder={t('search.chat_placeholder')}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={disabled || loading || !query.trim()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
        >
          {t('search.send')}
        </button>
      </form>
    </div>
  );
};
