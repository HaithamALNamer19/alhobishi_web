import React from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { calculatePaginationRange, getPageNumbers } from './pagination';

export interface UrlPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  itemName?: string;
  getPageHref: (page: number) => string;
  className?: string;
}

/**
 * Pure Server Component for URL-based pagination.
 * Avoids passing function props across React 19 RSC boundary.
 */
export function UrlPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 15,
  itemName = 'عنصر',
  getPageHref,
  className = '',
}: UrlPaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    if (!totalItems || totalItems === 0) return null;
    return (
      <div className={`flex items-center justify-between text-xs text-slate-500 py-3 px-2 ${className}`}>
        <span>
          إجمالي النتائج: <strong className="font-bold text-slate-800 font-mono">{totalItems}</strong> {itemName}
        </span>
      </div>
    );
  }

  const { startItem, endItem } = calculatePaginationRange(currentPage, pageSize, totalItems);
  const pages = getPageNumbers(currentPage, totalPages);

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  const prevButtonContent = (
    <>
      <ChevronRight className="w-4 h-4 ml-0.5" />
      <span>السابق</span>
    </>
  );

  const nextButtonContent = (
    <>
      <span>التالي</span>
      <ChevronLeft className="w-4 h-4 mr-0.5" />
    </>
  );

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-slate-600 ${className}`}
    >
      {/* Summary count */}
      {totalItems !== undefined ? (
        <div className="text-xs text-slate-500 font-medium">
          عرض <strong className="font-bold text-slate-900 font-mono">{startItem}</strong> إلى{' '}
          <strong className="font-bold text-slate-900 font-mono">{endItem}</strong> من أصل{' '}
          <strong className="font-bold text-slate-900 font-mono">{totalItems}</strong> {itemName}
        </div>
      ) : (
        <div className="text-xs text-slate-500 font-medium">
          الصفحة <strong className="font-bold text-slate-900 font-mono">{currentPage}</strong> من{' '}
          <strong className="font-bold text-slate-900 font-mono">{totalPages}</strong>
        </div>
      )}

      {/* Navigation Buttons and Page Numbers */}
      <div className="flex items-center gap-1.5" dir="rtl">
        {/* Previous Button (RTL: Chevron points Right) */}
        {isPrevDisabled ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-300 opacity-60 cursor-not-allowed select-none">
            {prevButtonContent}
          </span>
        ) : (
          <Link
            href={getPageHref(currentPage - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700 active:scale-95 transition-all shadow-2xs"
          >
            {prevButtonContent}
          </Link>
        )}

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
                >
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            const baseClass =
              'w-8 h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all cursor-pointer';
            const activeClass = isActive
              ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/30 font-black'
              : 'text-slate-700 hover:bg-slate-100 active:scale-95';

            return (
              <Link
                key={p}
                href={getPageHref(p)}
                className={`${baseClass} ${activeClass}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </Link>
            );
          })}
        </div>

        {/* Next Button (RTL: Chevron points Left) */}
        {isNextDisabled ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-300 opacity-60 cursor-not-allowed select-none">
            {nextButtonContent}
          </span>
        ) : (
          <Link
            href={getPageHref(currentPage + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700 active:scale-95 transition-all shadow-2xs"
          >
            {nextButtonContent}
          </Link>
        )}
      </div>
    </div>
  );
}

