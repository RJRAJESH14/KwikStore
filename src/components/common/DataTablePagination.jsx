import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable DataTablePagination Footer
 * Provides standard page size selector, row range text, and page jump buttons.
 */
export function DataTablePagination({
  totalRecords = 0,
  currentPage = 1,
  setCurrentPage,
  pageSize = 25,
  setPageSize,
  recordLabel = 'Records',
  pageSizeOptions = [10, 25, 50, 100],
  className = ''
}) {
  const { isDark } = useTheme();

  if (totalRecords === 0) return null;

  const numericPageSize = pageSize === 'ALL' ? totalRecords : Number(pageSize);
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalRecords / numericPageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * numericPageSize;
  const endIndex = pageSize === 'ALL' ? totalRecords : Math.min(startIndex + numericPageSize, totalRecords);

  return (
    <div className={`px-4 sm:px-6 py-3 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 select-none ${
      isDark ? 'bg-slate-900/95 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
    } ${className}`}>
      {/* Left: Range text & Rows per page selector */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
        <div className="text-xs">
          Showing <span className="font-mono font-bold text-slate-900 dark:text-white">{totalRecords > 0 ? startIndex + 1 : 0}</span> to <span className="font-mono font-bold text-slate-900 dark:text-white">{endIndex}</span> of <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{totalRecords}</span> {recordLabel}
        </div>

        {setPageSize && (
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setPageSize(val);
                if (setCurrentPage) setCurrentPage(1);
              }}
              className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
              }`}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="ALL">All ({totalRecords})</option>
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Buttons */}
      {pageSize !== 'ALL' && totalPages > 1 && setCurrentPage && (
        <div className="flex items-center space-x-1 sm:space-x-1.5 ml-auto">
          {/* First Page */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className={`p-1.5 rounded-lg border transition-all ${
              safeCurrentPage === 1
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : isDark ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
            }`}
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center space-x-1 transition-all ${
              safeCurrentPage === 1
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : isDark ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
            }`}
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1 px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
              .map((p, idx, arr) => {
                const prevP = arr[idx - 1];
                const isEllipsis = prevP && p - prevP > 1;
                return (
                  <React.Fragment key={p}>
                    {isEllipsis && <span className="px-1 text-slate-400 font-mono text-xs">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold font-mono transition-all ${
                        safeCurrentPage === p
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                          : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center space-x-1 transition-all ${
              safeCurrentPage === totalPages
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : isDark ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
            }`}
            title="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className={`p-1.5 rounded-lg border transition-all ${
              safeCurrentPage === totalPages
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : isDark ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
            }`}
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTablePagination;
