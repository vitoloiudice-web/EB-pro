import React from 'react';
import { accessibleButtonClasses } from '../../utils/a11y';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className="flex items-center justify-between py-4 px-2 bg-gray-50 rounded-lg border border-gray-200"
      role="navigation"
      aria-label="Paginazione"
    >
      {/* Info */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">{startItem}</span>
        {' - '}
        <span className="font-medium">{endItem}</span>
        {' di '}
        <span className="font-medium">{totalItems}</span>
        {' elementi'}
      </div>

      {/* Page Size Selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-gray-600">
            Righe per pagina:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
            aria-label="Seleziona numero di righe per pagina"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}

      {/* Page Buttons */}
      <div className="flex items-center gap-1" role="group" aria-label="Pagine">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${accessibleButtonClasses} text-sm py-1 px-2 bg-white border border-gray-300 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400`}
          aria-label="Pagina precedente"
        >
          ← Prev
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((page, idx) => (
          <button
            key={idx}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={typeof page === 'string' || page === currentPage}
            className={`
              ${accessibleButtonClasses} text-sm py-1 px-2 min-w-[2.5rem]
              ${page === currentPage
                ? 'bg-blue-500 text-white font-bold'
                : 'bg-white border border-gray-300 hover:bg-gray-100'
              }
              ${typeof page === 'string' ? 'cursor-default' : ''}
            `}
            aria-label={
              page === currentPage
                ? `Pagina corrente: ${page}`
                : `Vai a pagina ${page}`
            }
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${accessibleButtonClasses} text-sm py-1 px-2 bg-white border border-gray-300 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400`}
          aria-label="Pagina successiva"
        >
          Next →
        </button>
      </div>
    </div>
  );
};


