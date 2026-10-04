import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { DetailTabs } from './DetailTabs';
import type { AlfrescoDocument, Document } from '../types';

interface CompareViewProps<D extends Document> {
  documents: [D, D];
  getFileUrl: (documentId: string) => string;
  // The page's Info tab content for one document
  renderInfo: (doc: D) => React.ReactNode;
  onClose: () => void;
}

// With the details strip closed the previews fill the panel (capped at 100vh - 72px,
// minus its header and the file names); open, they make room for the strip.
const PREVIEW_HEIGHT = {
  full: { frame: 'h-[max(20rem,calc(100vh-180px))]', image: 'max-h-[max(20rem,calc(100vh-180px))]' },
  withDetails: { frame: 'h-[40vh]', image: 'max-h-[40vh]' },
};

// The AI's output often keeps markdown and quoting around values ("** 2026年8月6日",
// "\"786\""), which would make equal values look different.
const valueText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return JSON.stringify(value, null, 2);
  return value
    .trim()
    .replace(/^[*_\s]+|[*_\s]+$/g, '')
    .replace(/^"(.*)"$/s, '$1')
    .trim();
};

// e.g. "-_invoice_number" → "invoice number", "**1._請求者情報" → "1. 請求者情報"
const fieldLabel = (key: string) =>
  key
    .replace(/^[*_\-\s]+|[*_\-\s:]+$/g, '')
    .replace(/_/g, ' ')
    .trim() || key;

// The AI names fields a little differently from document to document
// ("invoice_number", "Invoice Number", "**1. Invoice number"), so match them
// on letters and digits only.
const fieldKey = (key: string) => key.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const sameValue = (a: string, b: string) =>
  a.replace(/\s+/g, ' ').toLowerCase() === b.replace(/\s+/g, ' ').toLowerCase();

interface FieldRow {
  label: string;
  values: [string, string];
  differs: boolean;
}

function compareFields(a: Record<string, unknown>, b: Record<string, unknown>): FieldRow[] {
  const rows = new Map<string, { label: string; values: [string, string] }>();
  for (const [index, data] of [a, b].entries()) {
    for (const [key, value] of Object.entries(data)) {
      const id = fieldKey(key) || key;
      const row = rows.get(id) ?? { label: fieldLabel(key), values: ['', ''] as [string, string] };
      row.values[index] = valueText(value);
      rows.set(id, row);
    }
  }
  return (
    [...rows.values()]
      // Empty on both sides: section headings from the AI's markdown, not data
      .filter(row => row.values[0] || row.values[1])
      .map(row => ({ ...row, differs: !sameValue(row.values[0], row.values[1]) }))
  );
}

// Only some files can be shown in a frame; e.g. Word files from Alfresco would download instead.
function previewKind(doc: Document): 'image' | 'frame' | 'none' {
  if (doc.fileType === 'image') return 'image';
  if (doc.fileType === 'pdf') return 'frame';
  const mimeType = (doc as Partial<AlfrescoDocument>).alfresco?.mimeType;
  return !mimeType || mimeType.startsWith('text/') ? 'frame' : 'none';
}

export function CompareView<D extends Document>({ documents, getFileUrl, renderInfo, onClose }: CompareViewProps<D>) {
  const { t } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const heights = detailsOpen ? PREVIEW_HEIGHT.withDetails : PREVIEW_HEIGHT.full;

  const rows = compareFields(documents[0].extractedData, documents[1].extractedData);
  const differing = rows.filter(row => row.differs).length;
  const hasData = documents.map(doc => Object.keys(doc.extractedData).length > 0);

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 w-full md:flex-1 min-w-0 lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto self-start">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-base font-bold text-gray-800">⇄ {t('compare.heading')}</h3>
        <button
          onClick={onClose}
          title={t('compare.close')}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {documents.map(doc => {
          const kind = previewKind(doc);
          return (
            <div key={doc.id} className="min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800 truncate" title={doc.filename}>
                  {doc.filename}
                </p>
                <a
                  href={getFileUrl(doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  {t('documents.preview.open')}
                </a>
              </div>
              {kind === 'image' && (
                <img
                  src={getFileUrl(doc.id)}
                  alt={doc.filename}
                  className={`w-full object-contain rounded-lg border border-gray-200 bg-gray-50 ${heights.image}`}
                />
              )}
              {kind === 'frame' && (
                <iframe
                  title={doc.filename}
                  src={getFileUrl(doc.id)}
                  className={`block w-full rounded-lg border border-gray-200 bg-white ${heights.frame}`}
                />
              )}
              {kind === 'none' && (
                <div
                  className={`flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 ${heights.frame}`}
                >
                  {t('compare.no_preview')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-gray-200 pt-2">
        <button
          onClick={() => setDetailsOpen(open => !open)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <span>{detailsOpen ? '▼' : '▶'}</span>
          {t('compare.details')}
          {hasData[0] && hasData[1] && (
            <span className={`text-xs font-normal ${differing > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {differing > 0
                ? t('compare.summary').replace('{diff}', String(differing)).replace('{total}', String(rows.length))
                : t('compare.identical').replace('{total}', String(rows.length))}
            </span>
          )}
        </button>

        {detailsOpen && (
          <div className="mt-2">
            <DetailTabs
              tabs={[
                {
                  id: 'data',
                  label: t('documents.tab.data'),
                  count: rows.length,
                  disabled: rows.length === 0,
                  content: <FieldComparison rows={rows} documents={documents} hasData={hasData} />,
                },
                {
                  id: 'info',
                  label: t('documents.tab.info'),
                  content: (
                    <div className="grid gap-3 md:grid-cols-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="min-w-0">
                          <p className="text-xs font-semibold text-gray-500 truncate mb-1">{doc.filename}</p>
                          {renderInfo(doc)}
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Usable only with exactly two documents ticked; with more it stays disabled until some are unticked.
export const CompareButton: React.FC<{ selectedCount: number; onClick: () => void }> = ({ selectedCount, onClick }) => {
  const { t } = useLanguage();
  const enabled = selectedCount === 2;
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={enabled ? undefined : t('compare.button.hint')}
      className="px-2 py-0.5 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      ⇄ {t('compare.button')}
    </button>
  );
};

const FieldComparison: React.FC<{ rows: FieldRow[]; documents: Document[]; hasData: boolean[] }> = ({
  rows,
  documents,
  hasData,
}) => {
  const { t } = useLanguage();
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-600 border-b border-gray-200">
            <th className="w-1/5 px-2 py-1">{t('compare.field')}</th>
            {documents.map((doc, i) => (
              <th key={doc.id} className="px-2 py-1 truncate" title={doc.filename}>
                {doc.filename}
                {!hasData[i] && <span className="ml-1 font-normal text-gray-400">({t('compare.no_data')})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.label} className={row.differs ? 'bg-yellow-50' : ''}>
              <td className="px-2 py-1 align-top font-mono text-xs text-gray-600 break-words">
                {row.differs && <span title={t('compare.differs')}>≠ </span>}
                {row.label}
              </td>
              {row.values.map((value, i) => (
                <td key={i} className="px-2 py-1 align-top text-gray-800 whitespace-pre-wrap break-words">
                  {value || <span className="text-gray-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
