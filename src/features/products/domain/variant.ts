import type { Money } from '@/core/domain/money';

export interface ProductOptionValue {
  id: string; // slug, e.g. 'red', 'large'
  label: string; // 'أحمر', 'كبير'
  swatch?: string; // hex color e.g. '#ef4444' for colors
}

export interface ProductOption {
  key: string; // 'color', 'size', 'material', etc.
  label: string; // 'اللون', 'المقاس', 'المادة'
  displayType: 'swatch' | 'button' | 'select';
  values: ProductOptionValue[];
}

export type StockState = 'in_stock' | 'low' | 'out';

export interface ProductVariant {
  id: string; // e.g. 'color-red__size-large' or 'default'
  productId: string;
  optionValues: Record<string, string>; // { color: 'red', size: 'large' }
  label: string; // 'أحمر / كبير'
  sku: string | null;
  barcode: string | null;
  retailPriceOverride: Money | null; // null = inherits product retailPrice
  images: string[] | null;

  stockQty: number; // Current physical on-shelf quantity
  reservedQty: number; // Reserved for pending/preparing orders
  availableQty: number; // stockQty - reservedQty
  lowStockThreshold: number; // default e.g. 5
  stockState: StockState;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generates a deterministic variant ID from an option combination.
 * Sorting keys alphabetically ensures `{ color: 'red', size: 'l' }` and
 * `{ size: 'l', color: 'red' }` always generate the exact same ID.
 */
export function generateVariantId(optionValues: Record<string, string>): string {
  const keys = Object.keys(optionValues).sort();
  if (keys.length === 0) return 'default';

  return keys
    .map((k) => `${k.trim().toLowerCase()}-${optionValues[k]?.trim().toLowerCase()}`)
    .join('__');
}

/** Finds a variant matching the given option selections. */
export function findMatchingVariant(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>
): ProductVariant | null {
  const targetId = generateVariantId(selectedOptions);
  return variants.find((v) => v.id === targetId) || null;
}

/** Computes the stock state according to available quantity and threshold. */
export function computeStockState(
  availableQty: number,
  threshold = 5
): StockState {
  if (availableQty <= 0) return 'out';
  if (availableQty <= threshold) return 'low';
  return 'in_stock';
}

/** Safe available quantity calculation. */
export function computeAvailableQty(stockQty: number, reservedQty: number): number {
  return Math.max(0, stockQty - Math.max(0, reservedQty));
}

/**
 * Customer stock display rule:
 * Do not show remaining stock to customers unless 10 or fewer items remain.
 */
export function formatCustomerStockDisplay(availableQty: number): {
  isAvailable: boolean;
  isLowStock: boolean;
  displayText: string;
  badgeText: string;
} {
  if (availableQty <= 0) {
    return {
      isAvailable: false,
      isLowStock: false,
      displayText: 'نفد من المخزون',
      badgeText: 'نفد من المخزون',
    };
  }

  if (availableQty <= 10) {
    return {
      isAvailable: true,
      isLowStock: true,
      displayText: `متبقي ${availableQty} فقط`,
      badgeText: `متبقي ${availableQty} فقط`,
    };
  }

  return {
    isAvailable: true,
    isLowStock: false,
    displayText: 'متوفر في المخزون',
    badgeText: 'متوفر في المخزون',
  };
}

/**
 * Builds all Cartesian combinations from a list of ProductOptions.
 * Used when an admin defines options (e.g. 3 sizes * 2 colors = 6 variants).
 */
export function generateOptionCombinations(
  options: ProductOption[]
): Array<{ optionValues: Record<string, string>; label: string }> {
  if (options.length === 0) {
    return [{ optionValues: {}, label: 'الافتراضي' }];
  }

  let combinations: Array<{ optionValues: Record<string, string>; labelParts: string[] }> = [
    { optionValues: {}, labelParts: [] },
  ];

  for (const option of options) {
    const nextCombinations: typeof combinations = [];
    for (const comb of combinations) {
      for (const val of option.values) {
        nextCombinations.push({
          optionValues: {
            ...comb.optionValues,
            [option.key]: val.id,
          },
          labelParts: [...comb.labelParts, val.label],
        });
      }
    }
    combinations = nextCombinations;
  }

  return combinations.map((c) => ({
    optionValues: c.optionValues,
    label: c.labelParts.join(' / '),
  }));
}

