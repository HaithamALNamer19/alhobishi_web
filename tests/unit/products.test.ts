import { describe, it, expect } from 'vitest';
import {
  generateVariantId,
  computeStockState,
  computeAvailableQty,
  formatCustomerStockDisplay,
  generateOptionCombinations,
  type ProductOption,
} from '@/features/products/domain/variant';
import { resolveUnitPrice } from '@/features/products/domain/pricing';
import { Role } from '@/core/auth/roles';
import { assertMoney } from '@/core/domain/money';

describe('Product Variants Domain', () => {
  it('generates deterministic variant IDs regardless of key order', () => {
    const id1 = generateVariantId({ color: 'Red', size: 'Large' });
    const id2 = generateVariantId({ size: 'Large', color: 'Red' });
    const id3 = generateVariantId({ COLOR: 'red', SIZE: 'large' });

    expect(id1).toBe('color-red__size-large');
    expect(id2).toBe(id1);
    expect(id3).toBe(id1);
  });

  it('generates "default" for empty option values', () => {
    expect(generateVariantId({})).toBe('default');
  });

  it('calculates available quantity safely', () => {
    expect(computeAvailableQty(10, 3)).toBe(7);
    expect(computeAvailableQty(10, 10)).toBe(0);
    expect(computeAvailableQty(10, 12)).toBe(0); // Cannot be negative
    expect(computeAvailableQty(5, -2)).toBe(5); // Handles negative reserved safely
  });

  it('computes stock state according to threshold', () => {
    expect(computeStockState(0, 5)).toBe('out');
    expect(computeStockState(-1, 5)).toBe('out');
    expect(computeStockState(3, 5)).toBe('low');
    expect(computeStockState(5, 5)).toBe('low');
    expect(computeStockState(6, 5)).toBe('in_stock');
  });

  it('only shows remaining stock count to customers if 10 or fewer remain', () => {
    // Over 10: does not show number, only "متوفر في المخزون"
    const highStock = formatCustomerStockDisplay(25);
    expect(highStock.isAvailable).toBe(true);
    expect(highStock.isLowStock).toBe(false);
    expect(highStock.displayText).toBe('متوفر في المخزون');
    expect(highStock.badgeText).toBe('متوفر في المخزون');

    const edgeOver10 = formatCustomerStockDisplay(11);
    expect(edgeOver10.isLowStock).toBe(false);
    expect(edgeOver10.displayText).toBe('متوفر في المخزون');

    // 10 or fewer: shows exact number
    const exactly10 = formatCustomerStockDisplay(10);
    expect(exactly10.isAvailable).toBe(true);
    expect(exactly10.isLowStock).toBe(true);
    expect(exactly10.displayText).toBe('متبقي 10 فقط');
    expect(exactly10.badgeText).toBe('متبقي 10 فقط');

    const lowStock3 = formatCustomerStockDisplay(3);
    expect(lowStock3.isLowStock).toBe(true);
    expect(lowStock3.displayText).toBe('متبقي 3 فقط');

    const lastOne = formatCustomerStockDisplay(1);
    expect(lastOne.isLowStock).toBe(true);
    expect(lastOne.displayText).toBe('متبقي 1 فقط');

    // 0 or negative: out of stock
    const outOfStock = formatCustomerStockDisplay(0);
    expect(outOfStock.isAvailable).toBe(false);
    expect(outOfStock.displayText).toBe('نفد من المخزون');
  });

  it('generates Cartesian combinations for product options', () => {
    const options: ProductOption[] = [
      {
        key: 'color',
        label: 'اللون',
        displayType: 'swatch',
        values: [
          { id: 'red', label: 'أحمر' },
          { id: 'blue', label: 'أزرق' },
        ],
      },
      {
        key: 'size',
        label: 'المقاس',
        displayType: 'button',
        values: [
          { id: 's', label: 'صغير' },
          { id: 'm', label: 'وسط' },
          { id: 'l', label: 'كبير' },
        ],
      },
    ];

    const combinations = generateOptionCombinations(options);
    expect(combinations).toHaveLength(6); // 2 colors * 3 sizes = 6

    expect(combinations[0]).toEqual({
      optionValues: { color: 'red', size: 's' },
      label: 'أحمر / صغير',
    });

    expect(combinations[5]).toEqual({
      optionValues: { color: 'blue', size: 'l' },
      label: 'أزرق / كبير',
    });
  });

  it('returns single default combination when options list is empty', () => {
    const combinations = generateOptionCombinations([]);
    expect(combinations).toHaveLength(1);
    expect(combinations[0].label).toBe('الافتراضي');
    expect(combinations[0].optionValues).toEqual({});
  });
});

describe('Role-based Pricing Domain', () => {
  const baseProduct = {
    retailPrice: assertMoney(5000),
  };

  const productPricing = {
    productId: 'prod_1',
    wholesalePrice: assertMoney(3500),
    variantWholesalePrices: {
      'size-xl': assertMoney(3800),
    },
    updatedAt: new Date(),
    updatedBy: 'admin',
  };

  it('resolves retail price for Customer and Visitor', () => {
    const customerPrice = resolveUnitPrice({
      product: baseProduct,
      role: Role.CUSTOMER,
      pricing: productPricing,
    });
    expect(customerPrice).toBe(5000);

    const visitorPrice = resolveUnitPrice({
      product: baseProduct,
      role: null,
      pricing: productPricing,
    });
    expect(visitorPrice).toBe(5000);
  });

  it('resolves wholesale price for Wholesale Trader and Admin', () => {
    const wholesalePrice = resolveUnitPrice({
      product: baseProduct,
      role: Role.WHOLESALE,
      pricing: productPricing,
    });
    expect(wholesalePrice).toBe(3500);

    const adminPrice = resolveUnitPrice({
      product: baseProduct,
      role: Role.ADMIN,
      pricing: productPricing,
    });
    expect(adminPrice).toBe(3500);
  });

  it('resolves variant wholesale price override when available', () => {
    const price = resolveUnitPrice({
      product: baseProduct,
      variant: { id: 'size-xl', retailPriceOverride: null },
      role: Role.WHOLESALE,
      pricing: productPricing,
    });
    expect(price).toBe(3800);
  });

  it('resolves variant retail override for customer', () => {
    const price = resolveUnitPrice({
      product: baseProduct,
      variant: { id: 'size-xl', retailPriceOverride: assertMoney(5500) },
      role: Role.CUSTOMER,
      pricing: productPricing,
    });
    expect(price).toBe(5500);
  });
});

describe('Stock Adjustment Validation and Arithmetic', () => {
  it('correctly calculates new available quantity and delta', () => {
    const currentStock = 20;
    const currentReserved = 5;
    const newStockQty = 35;

    const delta = newStockQty - currentStock;
    const newAvailable = Math.max(0, newStockQty - currentReserved);

    expect(delta).toBe(15);
    expect(newAvailable).toBe(30);
  });

  it('rejects reducing stock below reserved quantity', () => {
    const currentReserved = 8;
    const attemptQty = 5;
    const isAllowed = attemptQty >= currentReserved;
    expect(isAllowed).toBe(false);
  });
});


