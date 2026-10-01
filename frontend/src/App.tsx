import React, { useState } from 'react';
import { Upload } from './pages/Upload';
import { Documents } from './pages/Documents';
import { Search } from './pages/Search';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import './styles/globals.css';

type TabType = 'upload' | 'documents' | 'search';

function AppContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDocumentUploaded = () => {
    setRefreshTrigger(t => t + 1);
    setActiveTab('documents');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('app.title.main')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('app.title.subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 border-b-2 font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('nav.upload')}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 border-b-2 font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('nav.documents')}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-3 border-b-2 font-medium transition-colors ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('nav.search')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'upload' && <Upload onDocumentUploaded={handleDocumentUploaded} />}
        {activeTab === 'documents' && <Documents refreshTrigger={refreshTrigger} />}
        {activeTab === 'search' && <Search />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-600">
          <p>
            {t('footer.ollama')} <code className="bg-gray-100 px-2 py-1 rounded">ollama run mistral</code>
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
