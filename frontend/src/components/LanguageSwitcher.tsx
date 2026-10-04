import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 hidden md:inline">{t('lang.selector')}:</span>
      <div className="flex border border-gray-300 rounded overflow-hidden text-xs font-medium">
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-1 transition-colors ${
            language === 'en' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {t('lang.english')}
        </button>
        <button
          onClick={() => setLanguage('ja')}
          className={`px-2 py-1 border-l border-gray-300 transition-colors ${
            language === 'ja' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {t('lang.japanese')}
        </button>
      </div>
    </div>
  );
};
