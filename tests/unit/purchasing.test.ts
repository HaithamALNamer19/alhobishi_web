import { describe, it, expect } from 'vitest';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { formatMoney } from '@/core/domain/money';
import type { PurchaseItem, PurchaseReturnItem, StockMovement } from '@/features/purchasing/domain/purchasing';

describe('Purchasing Cycle Logic & Calculations', () => {
  it('correctly calculates total amount and items count for purchase invoices', () => {
    const items: PurchaseItem[] = [
      { product_id: 'p1', product_name: 'شاحن أنكر 20W', quantity: 10, cost_price: 3500 },
      { product_id: 'p2', product_name: 'سماعة بلوتوث', quantity: 5, cost_price: 8000 },
      { product_id: 'p3', product_name: 'كيبل تايب سي', quantity: 20, cost_price: 1200 },
    ];

    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
    const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.cost_price, 0);

    expect(totalQty).toBe(35);
    // (10 * 3500) + (5 * 8000) + (20 * 1200) = 35000 + 40000 + 24000 = 99000
    expect(totalAmount).toBe(99000);
    expect(formatMoney(totalAmount)).toContain('99,000');
    expect(tafqeetRials(totalAmount)).toBe('فقط وقدره تسعة وتسعون ألف ريال يمني لا غير');
  });

  it('correctly simulates stock and supplier balance update on purchase invoice creation', () => {
    let currentStock = 15;
    let supplierBalance = 50000;

    const purchaseQty = 10;
    const unitCost = 4000;
    const invoiceTotal = purchaseQty * unitCost;

    // Simulate purchase transaction
    currentStock += purchaseQty;
    supplierBalance += invoiceTotal;

    const movement: StockMovement = {
      id: 'm1',
      product_id: 'p1',
      type: 'PURCHASE_IN',
      quantity: purchaseQty,
      reference_id: 'PUR-2026-0001',
      timestamp: new Date(),
    };

    expect(currentStock).toBe(25);
    expect(supplierBalance).toBe(90000);
    expect(movement.type).toBe('PURCHASE_IN');
    expect(movement.quantity).toBe(10);
  });

  it('correctly simulates stock deduction and supplier balance reduction on purchase return', () => {
    let currentStock = 25;
    let supplierBalance = 90000;

    const returnItems: PurchaseReturnItem[] = [
      { product_id: 'p1', product_name: 'شاحن أنكر 20W', quantity: 3, cost_price: 4000 },
    ];

    const returnTotal = returnItems.reduce((sum, it) => sum + it.quantity * it.cost_price, 0);

    // Simulate purchase return transaction
    currentStock = Math.max(0, currentStock - returnItems[0].quantity);
    supplierBalance -= returnTotal;

    const movement: StockMovement = {
      id: 'm2',
      product_id: 'p1',
      type: 'PURCHASE_RETURN_OUT',
      quantity: returnItems[0].quantity,
      reference_id: 'RET-PUR-2026-0001',
      timestamp: new Date(),
    };

    expect(currentStock).toBe(22);
    expect(supplierBalance).toBe(78000);
    expect(movement.type).toBe('PURCHASE_RETURN_OUT');
    expect(movement.quantity).toBe(3);
    expect(tafqeetRials(returnTotal)).toBe('فقط وقدره اثنا عشر ألف ريال يمني لا غير');
  });

  it('prevents stock from going below zero on returns', () => {
    let currentStock = 2;
    const returnedQty = 5;

    currentStock = Math.max(0, currentStock - returnedQty);
    expect(currentStock).toBe(0);
  });
});
