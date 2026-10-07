import { describe, it, expect } from 'vitest';
import { calculatePaginationRange, getPageNumbers } from '@/shared/ui/pagination';

describe('Pagination Unit Tests (Math & Windows)', () => {
  const PAGE_SIZE = 15;

  describe('Page count and range calculations (15 items per page)', () => {
    it('calculates accurate start and end items for page 1', () => {
      const { startItem, endItem } = calculatePaginationRange(1, PAGE_SIZE, 42);
      expect(startItem).toBe(1);
      expect(endItem).toBe(15);
    });

    it('calculates accurate start and end items for middle page', () => {
      const { startItem, endItem } = calculatePaginationRange(2, PAGE_SIZE, 42);
      expect(startItem).toBe(16);
      expect(endItem).toBe(30);
    });

    it('clamps endItem to totalItems for the last page', () => {
      const { startItem, endItem } = calculatePaginationRange(3, PAGE_SIZE, 42);
      expect(startItem).toBe(31);
      expect(endItem).toBe(42);
    });

    it('handles exact multiples of 15 items per page', () => {
      const { startItem, endItem } = calculatePaginationRange(2, PAGE_SIZE, 30);
      expect(startItem).toBe(16);
      expect(endItem).toBe(30);
    });

    it('handles single page with fewer than 15 items', () => {
      const { startItem, endItem } = calculatePaginationRange(1, PAGE_SIZE, 8);
      expect(startItem).toBe(1);
      expect(endItem).toBe(8);
    });

    it('handles 0 total items', () => {
      const { startItem, endItem } = calculatePaginationRange(1, PAGE_SIZE, 0);
      expect(startItem).toBe(0);
      expect(endItem).toBe(0);
    });
  });

  describe('Page number window generation (getPageNumbers)', () => {
    it('returns all page numbers when totalPages <= 7', () => {
      expect(getPageNumbers(1, 1)).toEqual([1]);
      expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('shows starting window with trailing ellipsis when currentPage <= 4 in large list', () => {
      const pages = getPageNumbers(2, 12);
      expect(pages).toEqual([1, 2, 3, 4, 5, '...', 12]);
    });

    it('shows ending window with leading ellipsis when currentPage is near the end', () => {
      const pages = getPageNumbers(11, 12);
      expect(pages).toEqual([1, '...', 8, 9, 10, 11, 12]);
    });

    it('shows middle window with two ellipses when currentPage is in the middle', () => {
      const pages = getPageNumbers(6, 12);
      expect(pages).toEqual([1, '...', 5, 6, 7, '...', 12]);
    });
  });
});

