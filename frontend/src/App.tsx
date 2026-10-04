import { useState } from 'react';
import { Upload } from './pages/Upload';
import { Documents } from './pages/Documents';
import { AlfrescoDocuments } from './pages/AlfrescoDocuments';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { OllamaStatusBanner } from './components/OllamaStatusBanner';
import './styles/globals.css';

type TabType = 'upload' | 'documents' | 'alfresco';

function AppContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDocumentUploaded = () => {
    setRefreshTrigger(t => t + 1);
    setActiveTab('documents');
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'upload', label: t('nav.upload') },
    { id: 'documents', label: t('nav.documents') },
    { id: 'alfresco', label: t('nav.alfresco') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Title, tabs and language switcher share one slim sticky bar (h-12) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 h-12 flex items-center gap-4">
          <h1
            title={t('app.title.subtitle')}
            className="text-lg font-bold text-gray-900 whitespace-nowrap hidden sm:block"
          >
            {t('app.title.main')}
          </h1>
          <nav className="flex self-stretch gap-1 min-w-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex-shrink-0">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <OllamaStatusBanner />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 py-3">
        {activeTab === 'upload' && <Upload onDocumentUploaded={handleDocumentUploaded} />}
        {activeTab === 'documents' && <Documents refreshTrigger={refreshTrigger} />}
        {activeTab === 'alfresco' && <AlfrescoDocuments />}
      </main>
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
