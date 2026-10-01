import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Document } from '../types';

interface DocumentListViewProps {
  documents: Document[];
  onDelete?: (id: string) => void;
  onClick?: (doc: Document) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  // Selects (true) or deselects (false) every document shown in the table.
  onSelectAll?: (selected: boolean) => void;
  // Hides the "In Alfresco" status column (pointless when browsing Alfresco itself)
  showStatus?: boolean;
  // Fallback for the data column when a document has no extracted data
  getSummary?: (doc: Document) => string | undefined;
}

export const DocumentListView: React.FC<DocumentListViewProps> = ({
  documents,
  onDelete,
  onClick,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  showStatus = true,
  getSummary,
}) => {
  const { t } = useLanguage();
  const selectable = !!onToggleSelect;
  const allSelected = selectable && documents.length > 0 && documents.every(doc => selectedIds?.has(doc.id));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return '📄';
    if (fileType === 'text') return '📝';
    return '🖼️';
  };

  const summarizeData = (doc: Document) => {
    const entries = Object.entries(doc.extractedData || {});
    if (entries.length === 0) {
      const summary = getSummary?.(doc);
      if (!summary) return '—';
      return summary.length > 60 ? `${summary.slice(0, 60)}…` : summary;
    }
    const [key, value] = entries[0];
    const valueText = typeof value === 'string' ? value : JSON.stringify(value);
    const summary = `${key}: ${valueText}`;
    const suffix = entries.length > 1 ? ` (+${entries.length - 1})` : '';
    return summary.length > 60 ? `${summary.slice(0, 60)}…${suffix}` : `${summary}${suffix}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {selectable && (
              <th className="pl-4 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll?.(!allSelected)}
                  title={t('documents.select.page')}
                  className="h-4 w-4 accent-blue-500 cursor-pointer"
                />
              </th>
            )}
            <th className="px-4 py-2">{t('document.filename')}</th>
            <th className="px-4 py-2">{t('document.uploaded')}</th>
            <th className="px-4 py-2">{t('documents.list.type')}</th>
            <th className="px-4 py-2">{t('documents.list.data')}</th>
            {showStatus && <th className="px-4 py-2">{t('documents.list.status')}</th>}
            <th className="px-4 py-2 text-right">{t('documents.list.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documents.map(doc => (
            <tr
              key={doc.id}
              className={`cursor-pointer ${selectedIds?.has(doc.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
              onClick={() => onClick?.(doc)}
            >
              {selectable && (
                <td className="pl-4 py-2">
                  <input
                    type="checkbox"
                    checked={!!selectedIds?.has(doc.id)}
                    onChange={() => onToggleSelect?.(doc.id)}
                    onClick={e => e.stopPropagation()}
                    title={t('documents.select')}
                    className="h-4 w-4 accent-blue-500 cursor-pointer"
                  />
                </td>
              )}
              <td className="px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                  <span className="font-medium text-gray-800 truncate max-w-xs">{doc.filename}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{formatDate(doc.uploadedAt)}</td>
              <td className="px-4 py-2 text-sm text-gray-600 uppercase">{doc.fileType}</td>
              <td className="px-4 py-2 text-sm text-gray-600 max-w-sm truncate">{summarizeData(doc)}</td>
              {showStatus && (
                <td className="px-4 py-2 text-sm">
                  {doc.alfrescoNodeId ? (
                    <span className="text-green-700">✅ {t('documents.list.alfresco')}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              )}
              <td className="px-4 py-2 text-right">
                {onDelete && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
