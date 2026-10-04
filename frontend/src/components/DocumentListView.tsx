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
    // Short columns get fixed widths so their text never wraps when the list is
    // narrow (e.g. beside the details panel); below the minimum width the table
    // scrolls sideways instead of squeezing them.
    <div className="overflow-x-auto">
      <table
        className={`w-full table-fixed divide-y divide-gray-200 ${showStatus ? 'min-w-[760px]' : 'min-w-[620px]'}`}
      >
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
            {selectable && (
              <th className="pl-3 py-1.5 w-9">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll?.(!allSelected)}
                  title={t('documents.select.page')}
                  className="h-4 w-4 accent-blue-500 cursor-pointer"
                />
              </th>
            )}
            <th className="px-3 py-1.5">{t('document.filename')}</th>
            <th className="px-3 py-1.5 w-28">{t('document.uploaded')}</th>
            <th className="px-3 py-1.5 w-20">{t('documents.list.type')}</th>
            <th className="px-3 py-1.5">{t('documents.list.data')}</th>
            {showStatus && <th className="px-3 py-1.5 w-36">{t('documents.list.status')}</th>}
            <th className="px-3 py-1.5 w-24 text-right">{t('documents.list.actions')}</th>
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
                <td className="pl-3 py-1.5">
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
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0" title={doc.filename}>
                  <span className="text-base flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                  <span className="font-medium text-gray-800 truncate">{doc.filename}</span>
                </div>
              </td>
              <td className="px-3 py-1.5 text-sm text-gray-600 whitespace-nowrap">{formatDate(doc.uploadedAt)}</td>
              <td className="px-3 py-1.5 text-sm text-gray-600 uppercase whitespace-nowrap">{doc.fileType}</td>
              <td className="px-3 py-1.5 text-sm text-gray-600 truncate" title={summarizeData(doc)}>
                {summarizeData(doc)}
              </td>
              {showStatus && (
                <td className="px-3 py-1.5 text-sm whitespace-nowrap">
                  {doc.alfrescoNodeId ? (
                    <span className="text-green-700">✅ {t('documents.list.alfresco')}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              )}
              <td className="px-3 py-1.5 text-right">
                {onDelete && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                    className="px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded text-sm"
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
