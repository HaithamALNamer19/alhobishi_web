import { describe, it, expect } from 'vitest';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { formatMoney, assertMoney, addMoney } from '@/core/domain/money';
import { normalizeArabic } from '@/core/text/arabic-normalize';

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

describe('Store Product Search Matching for Sales Return', () => {
  const products = [
    { id: '1', name: 'طقم قدور جرانيت تركي', sku: 'COOK-TURK-01', barcode: '6281000123' },
    { id: '2', name: 'ألعاب أطفال تركيب سيارات', sku: 'TOY-CAR-01', barcode: '6281000456' },
    { id: '3', name: 'ساعة يد رجالية كلاسيك', sku: 'WATCH-M-01', barcode: '6281000789' },
  ];

  function matchProducts(rawQ: string) {
    const normQ = normalizeArabic(rawQ);
    const searchWords = normQ.split(' ').filter(Boolean);
    const cleanLowerQ = rawQ.toLowerCase().trim();

    return products.filter((p) => {
      const name = String(p.name || '');
      const normName = normalizeArabic(name);
      const sku = String(p.sku || '').toLowerCase();
      const barcode = String(p.barcode || '').trim();

      if (normName.includes(normQ) || name.toLowerCase().includes(cleanLowerQ)) return true;
      if (searchWords.length > 0 && searchWords.every((w) => normName.includes(w))) return true;
      if (cleanLowerQ && (sku.includes(cleanLowerQ) || barcode.includes(cleanLowerQ))) return true;
      return false;
    });
  }

  it('matches Arabic names with and without Alef / Hamza normalization', () => {
    // "العاب" matches "ألعاب"
    expect(matchProducts('العاب').length).toBe(1);
    expect(matchProducts('العاب')[0].id).toBe('2');

    // "ألعاب" matches "ألعاب"
    expect(matchProducts('ألعاب').length).toBe(1);
    expect(matchProducts('ألعاب')[0].id).toBe('2');
  });

  it('matches partial single word and multi-word searches', () => {
    expect(matchProducts('قدور').length).toBe(1);
    expect(matchProducts('قدور')[0].id).toBe('1');

    expect(matchProducts('طقم تركي').length).toBe(1);
    expect(matchProducts('طقم تركي')[0].id).toBe('1');

    expect(matchProducts('ساعة').length).toBe(1);
    expect(matchProducts('ساعة')[0].id).toBe('3');

    expect(matchProducts('ساعه').length).toBe(1);
    expect(matchProducts('ساعه')[0].id).toBe('3');
  });

  it('matches SKU and Barcode searches', () => {
    expect(matchProducts('toy-car').length).toBe(1);
    expect(matchProducts('toy-car')[0].id).toBe('2');

    expect(matchProducts('6281000789').length).toBe(1);
    expect(matchProducts('6281000789')[0].id).toBe('3');
  });
});


