/**
 * Money is stored as an integer number of the smallest currency unit.
 * The Yemeni Rial is handled without fractions, so 1 unit = 1 YER.
 * Never use floating point arithmetic for money.
 */
export type Money = number & { readonly __brand?: 'Money' };

export const CURRENCY = {
  code: 'YER',
  symbol: 'ر.ي',
  /** Fraction digits stored. YER is handled as whole rials. */
  fractionDigits: 0,
} as const;

export function isValidMoney(value: unknown): value is Money {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function assertMoney(value: number, label = 'amount'): Money {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer, got ${value}`);
  }
  return value as Money;
}

export function addMoney(...values: Money[]): Money {
  return assertMoney(values.reduce<number>((sum, v) => sum + v, 0), 'sum');
}

export function multiplyMoney(unitPrice: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity)) throw new RangeError('quantity must be an integer');
  return assertMoney(unitPrice * quantity, 'line total');
}

const numberFormatter = new Intl.NumberFormat('ar-YE-u-nu-latn', {
  maximumFractionDigits: CURRENCY.fractionDigits,
  minimumFractionDigits: CURRENCY.fractionDigits,
});

/** Formats as "75,000 ر.ي" (Latin digits are clearer for prices and invoices). */
export function formatMoney(value: Money): string {
  return `${numberFormatter.format(value)} ${CURRENCY.symbol}`;
}

