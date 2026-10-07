import { describe, it, expect } from 'vitest';
import { computeStockState, computeAvailableQty } from '@/features/products/domain/variant';

describe('Inventory & Stock Alerts Logic', () => {
  it('correctly classifies a variant as out-of-stock when availableQty is 0 or less', () => {
    expect(computeStockState(0, 5)).toBe('out');
    expect(computeStockState(-2, 5)).toBe('out');
  });

  it('correctly classifies a variant as low-stock when availableQty is between 1 and threshold', () => {
    expect(computeStockState(1, 5)).toBe('low');
    expect(computeStockState(3, 5)).toBe('low');
    expect(computeStockState(5, 5)).toBe('low');
  });

  it('correctly classifies a variant as in-stock when availableQty exceeds threshold', () => {
    expect(computeStockState(6, 5)).toBe('in_stock');
    expect(computeStockState(20, 5)).toBe('in_stock');
  });

  it('correctly aggregates multi-variant product stock state', () => {
    const productVariants = [
      { id: 'v1', stockQty: 0, reservedQty: 0, availableQty: 0, lowStockThreshold: 5 },
      { id: 'v2', stockQty: 0, reservedQty: 0, availableQty: 0, lowStockThreshold: 5 },
    ];

    const totalAvailable = productVariants.reduce((sum, v) => sum + v.availableQty, 0);
    const isOut = totalAvailable <= 0;
    expect(isOut).toBe(true);

    // If one variant gets restocked
    productVariants[0].availableQty = 3;
    const newTotal = productVariants.reduce((sum, v) => sum + v.availableQty, 0);
    const hasLow = productVariants.some((v) => v.availableQty > 0 && v.availableQty <= v.lowStockThreshold);
    expect(newTotal).toBe(3);
    expect(hasLow).toBe(true);
  });
});

describe('Dashboard Orders Status Categorization', () => {
  it('properly segregates orders into workflow buckets', () => {
    const orders = [
      { id: '1', status: 'PENDING', totalAmount: 10000, businessDate: '2026-10-07' },
      { id: '2', status: 'PREPARING', totalAmount: 20000, businessDate: '2026-10-07' },
      { id: '3', status: 'READY', totalAmount: 15000, businessDate: '2026-10-07' },
      { id: '4', status: 'CONFIRMED', totalAmount: 30000, businessDate: '2026-10-07' },
      { id: '5', status: 'CANCELLED', totalAmount: 5000, businessDate: '2026-10-06' },
    ];

    const pending = orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'PARTIALLY_READY'
    );
    const ready = orders.filter((o) => o.status === 'READY');
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'COMPLETED');
    const todayOrders = orders.filter((o) => o.businessDate === '2026-10-07');
    const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    expect(pending.length).toBe(2);
    expect(ready.length).toBe(1);
    expect(confirmed.length).toBe(1);
    expect(todayOrders.length).toBe(4);
    expect(todaySales).toBe(75000);
  });
});

describe('Notifications User ID Scoping', () => {
  it('includes staff and admin broadcasts only for backoffice roles', () => {
    const getTargets = (userId: string, isBackOffice: boolean) => {
      if (isBackOffice) return [userId, 'STAFF_BROADCAST', 'ADMIN_BROADCAST'];
      return [userId];
    };

    expect(getTargets('user-123', false)).toEqual(['user-123']);
    expect(getTargets('staff-456', true)).toEqual(['staff-456', 'STAFF_BROADCAST', 'ADMIN_BROADCAST']);
  });
});

