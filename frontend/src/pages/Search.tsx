import React, { useState } from 'react';
import { api } from '../api/client';
import { SearchBar } from '../components/SearchBar';
import { DocumentCard } from '../components/DocumentCard';
import { ChatPanel } from '../components/ChatPanel';

export const Search: React.FC = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleKeywordSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const results = await api.search(query);
      setSearchResults(results.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🔍 Search & Chat</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Keyword Search</h3>
            <SearchBar
              onSearch={handleKeywordSearch}
              disabled={searchLoading}
              placeholder="Search by filename, extracted data, or keywords..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {showChat ? '📊 Hide Chat' : '💬 Ask Questions'}
            </button>
          </div>
        </div>
      </div>

      {showChat && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '500px' }}>
          <ChatPanel />
        </div>
      )}

      {searchLoading ? (
        <div className="text-center text-gray-500 py-8">
          <p>🔄 Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Found {searchResults.length} document{searchResults.length !== 1 ? 's' : ''}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map(doc => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </div>
      ) : (
        searchResults !== null && (
          <div className="text-center text-gray-500 py-8">
            <p>No results found. Try a different search.</p>
          </div>
        )
      )}
    </div>
  );
};
