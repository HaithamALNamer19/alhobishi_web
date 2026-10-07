import type { Money } from '@/core/domain/money';
import type { Role } from '@/core/auth/roles';

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PREPARING'
  | 'PARTIALLY_READY'
  | 'READY'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderItemStatus = 'pending' | 'prepared' | 'partial' | 'unavailable';

export interface OrderItem {
  id: string; // usually variantId or uuid
  productId: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  image: string | null;
  sku: string | null;
  barcode: string | null;
  unitPrice: Money;
  requestedQty: number;
  preparedQty: number;
  status: OrderItemStatus;
  subtotal: Money;
  notes?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORD-2026-0001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerRole: Role;

  status: OrderStatus;
  businessDate: string; // YYYY-MM-DD
  items: OrderItem[];
  totalAmount: Money;
  customerNotes: string | null;

  isLocked: boolean; // Locked for customer edits once READY or CONFIRMED

  preparedBy: string | null;
  preparedAt: Date | null;
  confirmedBy: string | null;
  confirmedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'مسودة',
  PENDING: 'بانتظار التجهيز',
  PREPARING: 'جاري التجهيز',
  PARTIALLY_READY: 'جاهز جزئيًا',
  READY: 'جاهز للاستلام (مقفل)',
  CONFIRMED: 'معتمد (قُيدت المديونية)',
  COMPLETED: 'مكتمل ومسلّم',
  CANCELLED: 'ملغي',
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'بانتظار التجهيز',
  prepared: 'تم التجهيز بالكامل',
  partial: 'تم تجهيز جزء من الكمية',
  unavailable: 'غير متوفر',
};

/**
 * Returns true if customer is allowed to edit their order items.
 * Customers CAN edit in: PENDING, PREPARING, PARTIALLY_READY.
 * Customers CANNOT edit once READY or CONFIRMED or CANCELLED.
 */
export function canCustomerEditOrder(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'PREPARING' || status === 'PARTIALLY_READY';
}

/**
 * Checks if order is locked from any customer modifications.
 */
export function isOrderLocked(status: OrderStatus): boolean {
  return !canCustomerEditOrder(status);
}

