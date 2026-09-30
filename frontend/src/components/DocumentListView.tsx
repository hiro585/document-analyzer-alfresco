import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentListViewProps {
  documents: any[];
  onDelete?: (id: string) => void;
  onClick?: (doc: any) => void;
}

export const DocumentListView: React.FC<DocumentListViewProps> = ({ documents, onDelete, onClick }) => {
  const { t } = useLanguage();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return '📄';
    if (fileType === 'text') return '📝';
    return '🖼️';
  };

  const summarizeData = (extractedData: Record<string, unknown>) => {
    const entries = Object.entries(extractedData || {});
    if (entries.length === 0) return '—';
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
            <th className="px-4 py-2">{t('document.filename')}</th>
            <th className="px-4 py-2">{t('document.uploaded')}</th>
            <th className="px-4 py-2">{t('documents.list.type')}</th>
            <th className="px-4 py-2">{t('documents.list.data')}</th>
            <th className="px-4 py-2">{t('documents.list.status')}</th>
            <th className="px-4 py-2 text-right">{t('documents.list.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documents.map(doc => (
            <tr
              key={doc.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onClick?.(doc)}
            >
              <td className="px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                  <span className="font-medium text-gray-800 truncate max-w-xs">{doc.filename}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{formatDate(doc.uploadedAt)}</td>
              <td className="px-4 py-2 text-sm text-gray-600 uppercase">{doc.fileType}</td>
              <td className="px-4 py-2 text-sm text-gray-600 max-w-sm truncate">{summarizeData(doc.extractedData)}</td>
              <td className="px-4 py-2 text-sm">
                {doc.alfrescoNodeId ? (
                  <span className="text-green-700">✅ {t('documents.list.alfresco')}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
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
