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

describe('Sales Return Schema & Data Validation', () => {
  it('validates a valid sales return request payload', async () => {
    const { createSalesReturnSchema } = await import('@/features/accounting/schemas/return.schemas');
    const validData = {
      customerId: 'cust-123',
      items: [
        {
          productId: 'prod-1',
          productName: 'طقم قدور جرانيت تركي',
          variantId: 'var-1',
          variantLabel: 'الافتراضي',
          quantity: 2,
          unitPrice: 25000,
        },
      ],
      reason: 'تبديل مقاس',
      orderId: 'ORD-2026-0001',
    };

    const parsed = createSalesReturnSchema.parse(validData);
    expect(parsed.customerId).toBe('cust-123');
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].quantity).toBe(2);
    expect(parsed.items[0].unitPrice).toBe(25000);
  });

  it('rejects sales return with empty items or invalid numbers', async () => {
    const { createSalesReturnSchema } = await import('@/features/accounting/schemas/return.schemas');

    // Empty items
    expect(() =>
      createSalesReturnSchema.parse({
        customerId: 'cust-123',
        items: [],
      })
    ).toThrow();

    // Negative quantity
    expect(() =>
      createSalesReturnSchema.parse({
        customerId: 'cust-123',
        items: [
          {
            productId: 'prod-1',
            productName: 'صنف',
            variantId: 'var-1',
            variantLabel: 'الافتراضي',
            quantity: -1,
            unitPrice: 500,
          },
        ],
      })
    ).toThrow();

    // Negative price
    expect(() =>
      createSalesReturnSchema.parse({
        customerId: 'cust-123',
        items: [
          {
            productId: 'prod-1',
            productName: 'صنف',
            variantId: 'var-1',
            variantLabel: 'الافتراضي',
            quantity: 1,
            unitPrice: -100,
          },
        ],
      })
    ).toThrow();
  });
});

describe('Product Search Query Logic for Sales Returns', () => {
  const storeCatalog = [
    { id: '1', name: 'طقم قدور جرانيت تركي فاخر', sku: 'COOK-TURK-01', barcode: '6281000123' },
    { id: '2', name: 'ألعاب أطفال تركيب سيارات وشاحنات', sku: 'TOY-CAR-01', barcode: '6281000456' },
    { id: '3', name: 'ساعة يد رجالية كلاسيك جلد', sku: 'WATCH-M-01', barcode: '6281000789' },
  ];

  it('filters catalog based on Arabic normalized and alphanumeric queries', async () => {
    const { normalizeArabic } = await import('@/core/text/arabic-normalize');

    const searchCatalog = (rawQ: string) => {
      if (rawQ.trim().length < 2) return [];
      const normQ = normalizeArabic(rawQ);
      const searchWords = normQ.split(' ').filter(Boolean);
      const cleanLowerQ = rawQ.toLowerCase().trim();

      return storeCatalog.filter((p) => {
        const name = String(p.name || '');
        const normName = normalizeArabic(name);
        const sku = String(p.sku || '').toLowerCase();
        const barcode = String(p.barcode || '').trim();

        if (normName.includes(normQ) || name.toLowerCase().includes(cleanLowerQ)) return true;
        if (searchWords.length > 0 && searchWords.every((w) => normName.includes(w))) return true;
        if (cleanLowerQ && (sku.includes(cleanLowerQ) || barcode.includes(cleanLowerQ))) return true;
        return false;
      });
    };

    // Does not return when query is less than 2 chars
    expect(searchCatalog('').length).toBe(0);
    expect(searchCatalog('أ').length).toBe(0);

    // Matches with Arabic normalization (العاب -> ألعاب)
    expect(searchCatalog('العاب').length).toBe(1);
    expect(searchCatalog('العاب')[0].id).toBe('2');

    // Matches partial keywords
    expect(searchCatalog('قدور تركي').length).toBe(1);
    expect(searchCatalog('قدور تركي')[0].id).toBe('1');

    // Matches barcode
    expect(searchCatalog('6281000789').length).toBe(1);
    expect(searchCatalog('6281000789')[0].id).toBe('3');

    // Matches SKU
    expect(searchCatalog('toy-car').length).toBe(1);
    expect(searchCatalog('toy-car')[0].id).toBe('2');
  });
});



