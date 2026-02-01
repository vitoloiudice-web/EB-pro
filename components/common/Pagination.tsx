import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Pagina {currentPage} di {totalPages}
        </p>
        
        <nav className="relative z-0 inline-flex space-x-2" aria-label="Pagination">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="neu-icon-btn w-8 h-8 disabled:opacity-30"
          >
            <span className="sr-only">Precedente</span>
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
            .map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                  currentPage === page
                    ? 'neu-pressed text-blue-600'
                    : 'neu-flat text-slate-500 hover:text-slate-700'
                }`}
              >
                {page}
              </button>
            ))
          }

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="neu-icon-btn w-8 h-8 disabled:opacity-30"
          >
            <span className="sr-only">Successivo</span>
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;