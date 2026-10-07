import { describe, it, expect } from 'vitest';
import {
  canCustomerEditOrder,
  isOrderLocked,
  type OrderStatus,
} from '@/features/orders/domain/order';
import { assertMoney, addMoney } from '@/core/domain/money';

describe('Order Lifecycle Domain', () => {
  it('allows customer order editing ONLY in PENDING, PREPARING, and PARTIALLY_READY', () => {
    expect(canCustomerEditOrder('DRAFT')).toBe(false);
    expect(canCustomerEditOrder('PENDING')).toBe(true);
    expect(canCustomerEditOrder('PREPARING')).toBe(true);
    expect(canCustomerEditOrder('PARTIALLY_READY')).toBe(true);

    // Locked once ready or confirmed
    expect(canCustomerEditOrder('READY')).toBe(false);
    expect(canCustomerEditOrder('CONFIRMED')).toBe(false);
    expect(canCustomerEditOrder('COMPLETED')).toBe(false);
    expect(canCustomerEditOrder('CANCELLED')).toBe(false);
  });

  it('correctly locks orders from customer editing once READY or CONFIRMED', () => {
    expect(isOrderLocked('READY')).toBe(true);
    expect(isOrderLocked('CONFIRMED')).toBe(true);
    expect(isOrderLocked('COMPLETED')).toBe(true);
    expect(isOrderLocked('PENDING')).toBe(false);
  });
});

describe('Accounting & Ledger Arithmetic (YER)', () => {
  it('correctly calculates new balance when invoicing and payment occur', () => {
    const initialBalance = assertMoney(50000); // 50,000 previous balance

    // New invoice confirmed: 25,000 YER
    const invoiceAmount = assertMoney(25000);
    const balanceAfterInvoice = addMoney(initialBalance, invoiceAmount);
    expect(balanceAfterInvoice).toBe(75000);

    // Customer makes payment: 30,000 YER
    const paymentAmount = assertMoney(30000);
    const balanceAfterPayment = addMoney(balanceAfterInvoice, -paymentAmount);
    expect(balanceAfterPayment).toBe(45000);
  });
});

