import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'ja';

interface Translations {
  [key: string]: { en: string; ja: string };
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch('/translations.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const translationsMap: Translations = {};
        const stringElements = xmlDoc.getElementsByTagName('string');

        for (let i = 0; i < stringElements.length; i++) {
          const element = stringElements[i];
          const key = element.getAttribute('key');
          const en = element.getAttribute('en');
          const ja = element.getAttribute('ja');

          if (key && en && ja) {
            translationsMap[key] = { en, ja };
          }
        }

        setTranslations(translationsMap);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };

    loadTranslations();
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translation = translations[key];
      if (!translation) {
        console.warn(`✗ Translation key not found: ${key}`);
        return key;
      }
      const result = translation[language];
      return result;
    },
    [language, translations],
  );

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    translations,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
