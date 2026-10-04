import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Document } from '../types';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onClick?: (doc: Document) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  // Shown when the document has no extracted data (e.g. an Alfresco document not exported by this app)
  summary?: string;
  // Falls back to the file-type icon when omitted or when the image fails to load
  thumbnailUrl?: string;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDelete,
  onClick,
  selected,
  onToggleSelect,
  summary,
  thumbnailUrl,
}) => {
  const { t } = useLanguage();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  useEffect(() => setThumbnailFailed(false), [thumbnailUrl]);
  const dataEntries = Object.entries(document.extractedData);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return '📄';
    if (fileType === 'text') return '📝';
    return '🖼️';
  };

  return (
    <div
      className={`bg-white border rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer ${
        selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
      }`}
      onClick={() => onClick?.(document)}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={!!selected}
                onChange={() => onToggleSelect(document.id)}
                onClick={e => e.stopPropagation()}
                title={t('documents.select')}
                className="h-4 w-4 accent-blue-500 cursor-pointer"
              />
            )}
            {thumbnailUrl && !thumbnailFailed ? (
              <img
                src={thumbnailUrl}
                alt=""
                loading="lazy"
                onError={() => setThumbnailFailed(true)}
                className="w-12 h-12 object-cover rounded border border-gray-200 bg-gray-50 flex-shrink-0"
              />
            ) : (
              <span className="w-12 h-12 flex items-center justify-center text-2xl rounded border border-gray-200 bg-gray-50 flex-shrink-0">
                {getFileIcon(document.fileType)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 truncate">{document.filename}</h3>
              <p className="text-xs text-gray-500">{formatDate(document.uploadedAt)}</p>
            </div>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(document.id);
            }}
            className="ml-2 px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded text-sm"
          >
            🗑️
          </button>
        )}
      </div>

      {document.originalPrompt && (
        <p className="text-xs text-gray-600 line-clamp-1" title={document.originalPrompt}>
          <span className="font-semibold">{t('alfresco.detail.prompt')}</span> {document.originalPrompt}
        </p>
      )}

      {dataEntries.length === 0 && summary && <p className="text-xs text-gray-600 line-clamp-2">{summary}</p>}

      {dataEntries.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
          {dataEntries.slice(0, 3).map(([key, value]) => {
            const text = typeof value === 'string' ? value : JSON.stringify(value);
            return (
              <p key={key} className="text-xs truncate" title={text}>
                <span className="text-gray-500">{key}:</span> <span className="text-gray-800">{text}</span>
              </p>
            );
          })}
          {dataEntries.length > 3 && (
            <p className="text-xs text-gray-400">
              {t('document.more_fields').replace('{count}', String(dataEntries.length - 3))}
            </p>
          )}
        </div>
      )}

      {(document.evaluations?.some(e => e.status === 'issues_found') || document.alfrescoNodeId) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {document.evaluations?.some(e => e.status === 'issues_found') && (
            <span className="px-1.5 py-0.5 text-[11px] bg-orange-50 border border-orange-200 text-orange-700 rounded">
              ⚠️ {t('agents.results.issues_badge')}
            </span>
          )}
          {document.alfrescoNodeId && (
            <span
              className="px-1.5 py-0.5 text-[11px] bg-green-50 border border-green-200 text-green-700 rounded"
              title={
                document.alfrescoExportedAt
                  ? t('document.exported_date').replace('{date}', formatDate(document.alfrescoExportedAt))
                  : undefined
              }
            >
              ✅ {t('documents.list.alfresco')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
