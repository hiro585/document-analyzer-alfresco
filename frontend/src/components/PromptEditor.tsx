import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface PromptEditorProps {
  onPromptChange: (prompt: string) => void;
  disabled?: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ onPromptChange, disabled }) => {
  const { t, language } = useLanguage();
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    // Default to the "Summarize Document" template
    const defaultPrompt = t('prompt.template.3.text');
    setCustomPrompt(defaultPrompt);
    onPromptChange(defaultPrompt);
  }, [language, t]);

  const handleCustomPromptChange = (text: string) => {
    setCustomPrompt(text);
    onPromptChange(text);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('prompt.label')}</label>

        <textarea
          value={customPrompt}
          onChange={e => handleCustomPromptChange(e.target.value)}
          disabled={disabled}
          placeholder={t('prompt.placeholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 h-24 font-mono text-sm"
        />
      </div>
    </div>
  );
};
