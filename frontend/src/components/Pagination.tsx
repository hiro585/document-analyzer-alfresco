import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

// The page size picked by the user, remembered per page in localStorage.
export function usePageSize(storageKey: string): [number, (size: number) => void] {
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return PAGE_SIZE_OPTIONS.includes(saved) ? saved : PAGE_SIZE_OPTIONS[0];
    } catch {
      return PAGE_SIZE_OPTIONS[0];
    }
  });
  const updatePageSize = (size: number) => {
    setPageSize(size);
    try {
      localStorage.setItem(storageKey, String(size));
    } catch {
      // Storage unavailable; the choice just won't be remembered.
    }
  };
  return [pageSize, updatePageSize];
}

// The page that keeps the first visible item on screen after the page size changes.
export const pageAfterResize = (currentPage: number, oldSize: number, newSize: number) =>
  Math.floor(((currentPage - 1) * oldSize) / newSize) + 1;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Page-size picker, shown whenever there are more items than the smallest size
  pageSize?: number;
  totalItems?: number;
  onPageSizeChange?: (size: number) => void;
}

const getPageNumbers = (currentPage: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const addPage = (page: number) => {
    if (!pages.includes(page)) pages.push(page);
  };

  addPage(1);
  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    if (page > 1 && page < totalPages) addPage(page);
  }
  if (totalPages > 1) addPage(totalPages);

  const withEllipsis: (number | '…')[] = [];
  let previous = 0;
  for (const page of pages.sort((a, b) => a - b)) {
    if (previous && page - previous > 1) withEllipsis.push('…');
    withEllipsis.push(page);
    previous = page;
  }
  return withEllipsis;
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  onPageSizeChange,
}) => {
  const { t } = useLanguage();
  const showSizePicker =
    !!onPageSizeChange && pageSize !== undefined && totalItems !== undefined && totalItems > PAGE_SIZE_OPTIONS[0];
  if (totalPages <= 1 && !showSizePicker) return null;

  return (
    <div className="flex items-center justify-center gap-x-4 gap-y-2 mt-3 flex-wrap">
      {totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
          >
            ‹
          </button>

          {getPageNumbers(currentPage, totalPages).map((page, i) =>
            page === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded border ${
                  page === currentPage
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
          >
            ›
          </button>
        </div>
      )}

      {showSizePicker && (
        <label className="flex items-center gap-1 text-xs text-gray-600">
          {t('pagination.page_size')}
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};
