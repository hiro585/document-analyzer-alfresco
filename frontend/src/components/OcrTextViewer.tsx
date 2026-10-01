import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface OcrTextViewerProps {
  text?: string;
  ocrUsed?: boolean;
}

export const OcrTextViewer: React.FC<OcrTextViewerProps> = ({ text, ocrUsed }) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-800"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span>{t('ocr.heading')}</span>
        {ocrUsed && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">{t('ocr.badge')}</span>}
      </button>

      {expanded && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
          {ocrUsed && <p className="text-xs text-yellow-700 mb-2">⚠️ {t('ocr.notice')}</p>}
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-700 max-h-64 overflow-y-auto font-mono">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
};
