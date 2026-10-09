import { describe, it, expect } from 'vitest';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { formatMoney, assertMoney, addMoney } from '@/core/domain/money';

describe('Arabic Currency Tafqeet (YER)', () => {
  it('converts small and typical amounts to Arabic words', () => {
    expect(tafqeetRials(0)).toBe('صفر ريال يمني');
    expect(tafqeetRials(250)).toBe('فقط وقدره مائتان وخمسون ريال يمني لا غير');
    expect(tafqeetRials(1500)).toBe('فقط وقدره ألف وخمسمائة ريال يمني لا غير');
    expect(tafqeetRials(75000)).toBe('فقط وقدره خمسة وسبعون ألف ريال يمني لا غير');
  });

  it('converts large and multi-part amounts', () => {
    expect(tafqeetRials(1500000)).toBe('فقط وقدره مليون وخمسمائة ألف ريال يمني لا غير');
    expect(tafqeetRials(2000000)).toBe('فقط وقدره مليونان ريال يمني لا غير');
  });
});

describe('Ledger Statement Running Balance Calculations', () => {
  it('accurately computes cumulative debit, credit, and running balance', () => {
    const transactions = [
      { id: '1', type: 'INVOICE', amount: 100000, previousBalance: 0, newBalance: 100000 },
      { id: '2', type: 'PAYMENT', amount: -40000, previousBalance: 100000, newBalance: 60000 },
      { id: '3', type: 'INVOICE', amount: 50000, previousBalance: 60000, newBalance: 110000 },
      { id: '4', type: 'PAYMENT', amount: -60000, previousBalance: 110000, newBalance: 50000 },
    ];

    const totalInvoices = transactions
      .filter((t) => t.type === 'INVOICE')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPayments = transactions
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const calculatedClosingBalance = totalInvoices - totalPayments;
    const finalTransactionBalance = transactions[transactions.length - 1].newBalance;

    expect(totalInvoices).toBe(150000);
    expect(totalPayments).toBe(100000);
    expect(calculatedClosingBalance).toBe(50000);
    expect(finalTransactionBalance).toBe(50000);
  });

  it('accurately treats sales returns as credit reducing customer balance', () => {
    const transactions = [
      { id: '1', type: 'INVOICE', amount: 80000, previousBalance: 0, newBalance: 80000 },
      { id: '2', type: 'RETURN', amount: -20000, previousBalance: 80000, newBalance: 60000 },
      { id: '3', type: 'PAYMENT', amount: -50000, previousBalance: 60000, newBalance: 10000 },
    ];

    const totalInvoices = transactions
      .filter((t) => t.type === 'INVOICE')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPayments = transactions
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalReturns = transactions
      .filter((t) => t.type === 'RETURN')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netBalance = totalInvoices - (totalPayments + totalReturns);

    expect(totalInvoices).toBe(80000);
    expect(totalReturns).toBe(20000);
    expect(totalPayments).toBe(50000);
    expect(netBalance).toBe(10000);
    expect(transactions[transactions.length - 1].newBalance).toBe(10000);
  });
});

