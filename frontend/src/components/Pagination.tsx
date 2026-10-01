import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
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
  );
};
