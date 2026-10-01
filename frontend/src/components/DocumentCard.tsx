import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Document } from '../types';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onClick?: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete, onClick }) => {
  const { t } = useLanguage();
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
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(document)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getFileIcon(document.fileType)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 truncate">{document.filename}</h3>
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
            className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
          >
            🗑️
          </button>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-600 line-clamp-2">
          <span className="font-semibold">{t('search.query_placeholder')}:</span> {document.originalPrompt}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">{t('document.data')}:</h4>
        <div className="space-y-1">
          {Object.entries(document.extractedData)
            .slice(0, 3)
            .map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-gray-600">{key}:</span>{' '}
                <span className="text-gray-800 truncate block">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          {Object.keys(document.extractedData).length > 3 && (
            <p className="text-xs text-gray-500">+{Object.keys(document.extractedData).length - 3} more fields</p>
          )}
        </div>
      </div>

      {document.evaluations?.some(e => e.status === 'issues_found') && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
          <p className="text-xs text-orange-700">⚠️ {t('agents.results.issues_badge')}</p>
        </div>
      )}

      {document.alfrescoNodeId && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-700">
            ✅ <strong>In Alfresco</strong>
          </p>
          {document.alfrescoExportedAt && (
            <p className="text-xs text-green-600">Exported: {formatDate(document.alfrescoExportedAt)}</p>
          )}
        </div>
      )}
    </div>
  );
};
