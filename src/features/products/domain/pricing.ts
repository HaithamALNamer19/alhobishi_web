import type { Money } from '@/core/domain/money';
import { can, Permission, type Role } from '@/core/auth/roles';
import type { Product } from './product';
import type { ProductVariant } from './variant';

export interface ProductPricing {
  productId: string;
  wholesalePrice: Money;
  variantWholesalePrices: Record<string, Money>; // variantId -> custom wholesale price
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Pure domain function to resolve unit price based on user role.
 * - Customer / Visitor: Retail price (or variant retail override)
 * - Wholesale Trader / Admin: Wholesale price (or variant wholesale override)
 */
export function resolveUnitPrice(params: {
  product: Pick<Product, 'retailPrice'>;
  variant?: Pick<ProductVariant, 'id' | 'retailPriceOverride'> | null;
  pricing?: ProductPricing | null;
  role?: Role | null;
}): Money {
  const { product, variant, pricing, role } = params;

  const canSeeWholesale = can(role, Permission.PRICES_VIEW_WHOLESALE);

  if (canSeeWholesale && pricing) {
    if (variant?.id && pricing.variantWholesalePrices[variant.id] !== undefined) {
      return pricing.variantWholesalePrices[variant.id]!;
    }
    return pricing.wholesalePrice;
  }

  // Fallback to retail price
  if (variant?.retailPriceOverride !== undefined && variant.retailPriceOverride !== null) {
    return variant.retailPriceOverride;
  }

  return product.retailPrice;
}

