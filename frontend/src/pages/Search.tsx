import React from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { useLanguage } from '../contexts/LanguageContext';

export const Search: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">{t('search.heading')}</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '500px' }}>
        <ChatPanel />
      </div>
    </div>
  );
};
