import React from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{t('lang.selector')}:</span>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {t('lang.english')}
      </button>
      <button
        onClick={() => setLanguage('ja')}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          language === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {t('lang.japanese')}
      </button>
    </div>
  );
};
