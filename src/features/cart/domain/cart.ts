import type { Money } from '@/core/domain/money';

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: Date;
}

export interface CartResolvedItem {
  productId: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  image: string | null;
  unitPrice: Money;
  quantity: number;
  subtotal: Money;
  availableQty: number;
  inStock: boolean;
}

export interface CartSummary {
  items: CartResolvedItem[];
  totalQuantity: number;
  totalAmount: Money;
  hasOutOfStockItems: boolean;
}

