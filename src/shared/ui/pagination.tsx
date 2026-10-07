'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  itemName?: string;
  onPageChange?: (page: number) => void;
  getPageHref?: (page: number) => string;
  className?: string;
}

export function calculatePaginationRange(
  currentPage: number,
  pageSize: number,
  totalItems?: number
): { startItem: number; endItem: number } {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;
  return { startItem, endItem };
}

export function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 15,
  itemName = 'عنصر',
  onPageChange,
  getPageHref,
  className = '',
}: PaginationProps) {
  // If no items or only 1 page with no items, don't show navigation
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

  // Calculate items range: e.g., 1 - 15 of 45
  const { startItem, endItem } = calculatePaginationRange(currentPage, pageSize, totalItems);
  const pages = getPageNumbers(currentPage, totalPages);

  const handlePageClick = (page: number, e?: React.MouseEvent) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    if (onPageChange) {
      if (e) e.preventDefault();
      onPageChange(page);
    }
  };

  const renderPageItem = (page: number | '...', idx: number) => {
    if (page === '...') {
      return (
        <span
          key={`ellipsis-${idx}`}
          className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
        >
          ...
        </span>
      );
    }

    const isActive = page === currentPage;
    const baseClass =
      'w-8 h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all cursor-pointer';
    const activeClass = isActive
      ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/30 font-black'
      : 'text-slate-700 hover:bg-slate-100 active:scale-95';

    if (getPageHref && !onPageChange) {
      return (
        <Link
          key={page}
          href={getPageHref(page)}
          className={`${baseClass} ${activeClass}`}
          aria-current={isActive ? 'page' : undefined}
        >
          {page}
        </Link>
      );
    }

    return (
      <button
        key={page}
        type="button"
        onClick={(e) => handlePageClick(page, e)}
        className={`${baseClass} ${activeClass}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {page}
      </button>
    );
  };

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
        {getPageHref && !onPageChange ? (
          isPrevDisabled ? (
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
          )
        ) : (
          <button
            type="button"
            disabled={isPrevDisabled}
            onClick={(e) => handlePageClick(currentPage - 1, e)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
          >
            {prevButtonContent}
          </button>
        )}

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, i) => renderPageItem(p, i))}
        </div>

        {/* Next Button (RTL: Chevron points Left) */}
        {getPageHref && !onPageChange ? (
          isNextDisabled ? (
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
          )
        ) : (
          <button
            type="button"
            disabled={isNextDisabled}
            onClick={(e) => handlePageClick(currentPage + 1, e)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
          >
            {nextButtonContent}
          </button>
        )}
      </div>
    </div>
  );
}
