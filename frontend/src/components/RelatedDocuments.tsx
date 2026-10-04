import React from 'react';
import type { RelatedDocument } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

interface RelatedDocumentsProps {
  related: RelatedDocument[];
  loading: boolean;
  onSelect: (documentId: string) => void;
}

export const RelatedDocuments: React.FC<RelatedDocumentsProps> = ({ related, loading, onSelect }) => {
  const { t } = useLanguage();

  if (loading) return <p className="text-sm text-gray-500">{t('documents.related.loading')}</p>;
  if (related.length === 0) return <p className="text-sm text-gray-500">{t('documents.related.empty')}</p>;

  return (
    <div className="space-y-1.5">
      {related.map(doc => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className="w-full text-left bg-white border border-gray-200 rounded px-2 py-1.5 hover:bg-gray-50 hover:border-blue-300"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-blue-600 truncate">{doc.filename}</span>
            {doc.score !== undefined && (
              <span title={t('documents.related.similarity')} className="text-xs text-gray-400 flex-shrink-0">
                {Math.round(doc.score * 100)}%
              </span>
            )}
          </div>
          {doc.summary && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{doc.summary}</p>}
        </button>
      ))}
    </div>
  );
};
