import type { Money } from '@/core/domain/money';
import type { ProductOption, ProductVariant } from './variant';

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameNormalized: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  images: string[];
  sku: string | null;
  barcode: string | null;

  status: ProductStatus;
  isVisible: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;

  // Retail Price
  retailPrice: Money;
  retailPriceRange: { min: Money; max: Money };
  compareAtPrice: Money | null;

  // Options & Variants
  options: ProductOption[];
  hasVariants: boolean;

  // In-stock fast summary for queries
  inStock: boolean;
  availableOptionKeys: string[]; // e.g. ['color:red', 'size:l']
  searchKeywords: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDetail extends Product {
  variants: ProductVariant[];
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  categoryId: string;
  images?: string[];
  sku?: string | null;
  barcode?: string | null;
  retailPrice: Money;
  wholesalePrice: Money; // Saved to productPricing
  status?: ProductStatus;
  isVisible?: boolean;
  isFeatured?: boolean;
  options?: ProductOption[];
  variants?: Array<{
    optionValues: Record<string, string>;
    label: string;
    sku?: string | null;
    barcode?: string | null;
    retailPriceOverride?: Money | null;
    wholesalePriceOverride?: Money | null;
    stockQty: number;
    lowStockThreshold?: number;
  }>;
}

