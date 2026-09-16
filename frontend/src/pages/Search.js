import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api/client';
import { SearchBar } from '../components/SearchBar';
import { DocumentCard } from '../components/DocumentCard';
import { ChatPanel } from '../components/ChatPanel';
export const Search = () => {
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const handleKeywordSearch = async (query) => {
        setSearchLoading(true);
        try {
            const results = await api.search(query);
            setSearchResults(results.results);
        }
        catch (error) {
            console.error('Search failed:', error);
        }
        finally {
            setSearchLoading(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white p-6 rounded-lg border border-gray-200", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800 mb-4", children: "\uD83D\uDD0D Search & Chat" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-700 mb-2", children: "Keyword Search" }), _jsx(SearchBar, { onSearch: handleKeywordSearch, disabled: searchLoading, placeholder: "Search by filename, extracted data, or keywords..." })] }), _jsx("div", { className: "flex gap-2", children: _jsx("button", { onClick: () => setShowChat(!showChat), className: "flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors", children: showChat ? '📊 Hide Chat' : '💬 Ask Questions' }) })] })] }), showChat && (_jsx("div", { className: "bg-white rounded-lg border border-gray-200 overflow-hidden", style: { height: '500px' }, children: _jsx(ChatPanel, {}) })), searchLoading ? (_jsx("div", { className: "text-center text-gray-500 py-8", children: _jsx("p", { children: "\uD83D\uDD04 Searching..." }) })) : searchResults.length > 0 ? (_jsxs("div", { className: "bg-white p-6 rounded-lg border border-gray-200", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 mb-4", children: ["Found ", searchResults.length, " document", searchResults.length !== 1 ? 's' : ''] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: searchResults.map(doc => (_jsx(DocumentCard, { document: doc }, doc.id))) })] })) : (searchResults !== null && (_jsx("div", { className: "text-center text-gray-500 py-8", children: _jsx("p", { children: "No results found. Try a different search." }) })))] }));
};
//# sourceMappingURL=Search.js.map