import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Upload } from './pages/Upload';
import { Documents } from './pages/Documents';
import { Search } from './pages/Search';
import './styles/globals.css';
function App() {
    const [activeTab, setActiveTab] = useState('upload');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const handleDocumentUploaded = () => {
        setRefreshTrigger(t => t + 1);
        setActiveTab('documents');
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("header", { className: "bg-white shadow-sm border-b border-gray-200", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\uD83D\uDCCA Document Analyzer" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Upload, analyze, and search documents using local AI (Ollama)" })] }) }), _jsx("nav", { className: "bg-white border-b border-gray-200 sticky top-0 z-10", children: _jsx("div", { className: "max-w-7xl mx-auto px-6", children: _jsxs("div", { className: "flex gap-4", children: [_jsx("button", { onClick: () => setActiveTab('upload'), className: `px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === 'upload'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'}`, children: "\uD83D\uDCE4 Upload" }), _jsx("button", { onClick: () => setActiveTab('documents'), className: `px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === 'documents'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'}`, children: "\uD83D\uDCDA Documents" }), _jsx("button", { onClick: () => setActiveTab('search'), className: `px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === 'search'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'}`, children: "\uD83D\uDD0D Search & Chat" })] }) }) }), _jsxs("main", { className: "max-w-7xl mx-auto px-6 py-8", children: [activeTab === 'upload' && _jsx(Upload, { onDocumentUploaded: handleDocumentUploaded }), activeTab === 'documents' && _jsx(Documents, { refreshTrigger: refreshTrigger }), activeTab === 'search' && _jsx(Search, {})] }), _jsx("footer", { className: "bg-white border-t border-gray-200 mt-12", children: _jsx("div", { className: "max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-600", children: _jsxs("p", { children: ["\uD83D\uDCA1 Make sure Ollama is running: ", _jsx("code", { className: "bg-gray-100 px-2 py-1 rounded", children: "ollama run mistral" })] }) }) })] }));
}
export default App;
//# sourceMappingURL=App.js.map